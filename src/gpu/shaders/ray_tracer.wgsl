// ─── WebRay Compute Path Tracer ───
// All buffers follow strict 16-byte alignment for Metal/macOS compatibility.

// Output texture we write to
@group(0) @binding(0) var output_texture: texture_storage_2d<rgba8unorm, write>;

// Accumulation buffer for progressive rendering (vec4f per pixel)
@group(0) @binding(1) var<storage, read_write> accumulation: array<vec4f>;

// ─── Uniform Block (16-byte aligned) ───
struct Uniforms {
    camera_pos:       vec4f,   // xyz = position, w = fov_radians
    camera_forward:   vec4f,   // xyz = forward dir, w = unused
    camera_right:     vec4f,   // xyz = right dir, w = unused
    camera_up:        vec4f,   // xyz = up dir, w = unused
    resolution:       vec2f,   // viewport width, height
    frame_count:      u32,     // current frame for progressive accumulation
    max_bounces:      u32,     // max ray bounces
    samples_per_pixel: u32,    // samples per dispatch
    sky_intensity:    f32,     // HDR sky brightness
    _pad0:            f32,
    _pad1:            f32,
}

@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// ─── Geometry (16-byte aligned) ───
struct Sphere {
    center:       vec4f,   // xyz = center, w = radius
    albedo:       vec4f,   // xyz = color, w = material_type (0=diffuse,1=metal,2=glass,3=emissive)
    properties:   vec4f,   // x = roughness/ior, y = emission_strength, z,w = unused
}

struct Box {
    center:       vec4f,   // xyz = center, w = unused
    size:         vec4f,   // xyz = size (width, height, depth), w = unused
    albedo:       vec4f,   // xyz = color, w = material_type
    properties:   vec4f,   // x = roughness/ior, y = emission_strength, z,w = unused
}

struct Plane {
    position:     vec4f,   // xyz = position, w = unused
    normal:       vec4f,   // xyz = normal (normalized), w = unused
    albedo:       vec4f,   // xyz = color, w = material_type
    properties:   vec4f,   // x = roughness/ior, y = emission_strength, z,w = unused
}

@group(0) @binding(3) var<storage, read> spheres: array<Sphere>;
@group(0) @binding(4) var<storage, read> boxes: array<Box>;
@group(0) @binding(5) var<storage, read> planes: array<Plane>;

// ─── Scene Info (16-byte aligned) ───
struct SceneInfo {
    sphere_count: u32,
    box_count:    u32,
    plane_count:  u32,
    _pad0:        u32,
}

@group(0) @binding(6) var<storage, read> scene_info: SceneInfo;

// ─── Ray & Hit Record ───
struct Ray {
    origin:       vec3f,
    direction:    vec3f,
}

struct HitRecord {
    point:        vec3f,
    normal:       vec3f,
    t:            f32,
    front_face:   bool,
    primitive_id: u32,       // which sphere/box/plane index
    material_type: u32,      // 0=diffuse, 1=metal, 2=glass, 3=emissive
    albedo:       vec3f,
    roughness_or_ior: f32,
    emission_strength: f32,
}

#include "utils"
#include "materials"
#include "primitives"

// ─── Sky Color ───
fn sky_color(ray: Ray) -> vec3f {
    let unit_dir = normalize(ray.direction);
    let t = 0.5 * (unit_dir.y + 1.0);
    let sky = mix(vec3f(1.0, 1.0, 1.0), vec3f(0.5, 0.7, 1.0), t);
    return sky * uniforms.sky_intensity;
}

// ─── Sphere Intersection ───
fn hit_sphere(sphere: Sphere, ray: Ray, t_min: f32, t_max: f32, rec: ptr<function, HitRecord>) -> bool {
    let center = sphere.center.xyz;
    let radius = sphere.center.w;
    let oc = ray.origin - center;
    let a = dot(ray.direction, ray.direction);
    let half_b = dot(oc, ray.direction);
    let c = dot(oc, oc) - radius * radius;
    let discriminant = half_b * half_b - a * c;

    if discriminant < 0.0 {
        return false;
    }

    let sqrtd = sqrt(discriminant);
    var root = (-half_b - sqrtd) / a;
    if root < t_min || root > t_max {
        root = (-half_b + sqrtd) / a;
        if root < t_min || root > t_max {
            return false;
        }
    }

    (*rec).t = root;
    (*rec).point = ray.origin + root * ray.direction;
    let outward_normal = ((*rec).point - center) / radius;
    (*rec).front_face = dot(ray.direction, outward_normal) < 0.0;
    if (*rec).front_face {
        (*rec).normal = outward_normal;
    } else {
        (*rec).normal = -outward_normal;
    }

    (*rec).material_type = u32(sphere.albedo.w);
    (*rec).albedo = sphere.albedo.xyz;
    (*rec).roughness_or_ior = sphere.properties.x;
    (*rec).emission_strength = sphere.properties.y;

    return true;
}

// ─── Scene Traversal ───
fn hit_scene(ray: Ray, t_min: f32, t_max: f32, rec: ptr<function, HitRecord>) -> bool {
    var hit_anything = false;
    var closest = t_max;
    var temp_rec: HitRecord;

    // Test spheres
    for (var i = 0u; i < scene_info.sphere_count; i++) {
        if hit_sphere(spheres[i], ray, t_min, closest, &temp_rec) {
            hit_anything = true;
            closest = temp_rec.t;
            temp_rec.primitive_id = i;
            *rec = temp_rec;
        }
    }

    // Test boxes
    for (var i = 0u; i < scene_info.box_count; i++) {
        let box = boxes[i];
        if hit_box(box.center.xyz, box.size.xyz, ray, t_min, closest, &temp_rec) {
            hit_anything = true;
            closest = temp_rec.t;
            temp_rec.primitive_id = i;
            temp_rec.material_type = u32(box.albedo.w);
            temp_rec.albedo = box.albedo.xyz;
            temp_rec.roughness_or_ior = box.properties.x;
            temp_rec.emission_strength = box.properties.y;
            *rec = temp_rec;
        }
    }

    // Test planes
    for (var i = 0u; i < scene_info.plane_count; i++) {
        let plane = planes[i];
        if hit_plane(plane.position.xyz, plane.normal.xyz, ray, t_min, closest, &temp_rec) {
            hit_anything = true;
            closest = temp_rec.t;
            temp_rec.primitive_id = i;
            temp_rec.material_type = u32(plane.albedo.w);
            temp_rec.albedo = plane.albedo.xyz;
            temp_rec.roughness_or_ior = plane.properties.x;
            temp_rec.emission_strength = plane.properties.y;
            *rec = temp_rec;
        }
    }

    return hit_anything;
}

// ─── Path Trace ───
fn trace_ray(initial_ray: Ray, seed: ptr<function, u32>) -> vec3f {
    var ray = initial_ray;
    var color = vec3f(1.0, 1.0, 1.0);
    var light = vec3f(0.0, 0.0, 0.0);

    for (var bounce = 0u; bounce < uniforms.max_bounces; bounce++) {
        var rec: HitRecord;

        if !hit_scene(ray, 0.001, 1e30, &rec) {
            light += color * sky_color(ray);
            break;
        }

        let material_type = rec.material_type;
        let albedo = rec.albedo;

        var scattered_dir: vec3f;
        var attenuation: vec3f;
        var did_scatter = false;

        switch material_type {
            case 0u: { // Lambertian
                did_scatter = scatter_lambertian(rec.normal, seed, albedo, &scattered_dir, &attenuation);
            }
            case 1u: { // Metal
                did_scatter = scatter_metal(ray.direction, rec.normal, seed, albedo, rec.roughness_or_ior, &scattered_dir, &attenuation);
            }
            case 2u: { // Dielectric
                did_scatter = scatter_dielectric(ray.direction, rec.normal, rec.front_face, seed, rec.roughness_or_ior, &scattered_dir, &attenuation);
            }
            case 3u: { // Emissive
                let emission_strength = rec.emission_strength;
                light += color * albedo * emission_strength;
                did_scatter = false;
            }
            default: {
                did_scatter = false;
            }
        }

        if !did_scatter {
            break;
        }

        color *= attenuation;
        ray = Ray(rec.point + rec.normal * 0.001, scattered_dir);
    }

    return light;
}

// ─── Main Compute Kernel ───
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    let pixel = vec2u(global_id.xy);
    let dims = vec2u(u32(uniforms.resolution.x), u32(uniforms.resolution.y));

    if pixel.x >= dims.x || pixel.y >= dims.y {
        return;
    }

    let pixel_index = pixel.y * dims.x + pixel.x;
    var seed = pcg_hash(pixel_index + uniforms.frame_count * 719393u);

    var pixel_color = vec3f(0.0);

    for (var s = 0u; s < uniforms.samples_per_pixel; s++) {
        // Sub-pixel jitter for anti-aliasing
        let jitter_x = rand(&seed) - 0.5;
        let jitter_y = rand(&seed) - 0.5;

        let uv = vec2f(
            (f32(pixel.x) + jitter_x) / uniforms.resolution.x,
            (f32(pixel.y) + jitter_y) / uniforms.resolution.y,
        );

        // Map UV to [-1, 1], flip Y
        let ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);

        let fov = uniforms.camera_pos.w;
        let aspect = uniforms.resolution.x / uniforms.resolution.y;

        let ray_dir = normalize(
            uniforms.camera_forward.xyz
            + ndc.x * aspect * tan(fov * 0.5) * uniforms.camera_right.xyz
            + ndc.y * tan(fov * 0.5) * uniforms.camera_up.xyz
        );

        let ray = Ray(uniforms.camera_pos.xyz, ray_dir);
        pixel_color += trace_ray(ray, &seed);
    }

    pixel_color /= f32(uniforms.samples_per_pixel);

    // Progressive accumulation
    let prev = accumulation[pixel_index];
    let frame = f32(uniforms.frame_count);
    let accumulated = (prev.xyz * frame + pixel_color) / (frame + 1.0);
    accumulation[pixel_index] = vec4f(accumulated, 1.0);

    // Gamma correction (linear -> sRGB)
    let corrected = vec3f(
        pow(accumulated.x, 1.0 / 2.2),
        pow(accumulated.y, 1.0 / 2.2),
        pow(accumulated.z, 1.0 / 2.2),
    );

    textureStore(output_texture, pixel, vec4f(corrected, 1.0));
}
