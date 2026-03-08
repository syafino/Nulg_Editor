// ─── Material Types ───
// 0 = Lambertian (diffuse)
// 1 = Metal (reflective)
// 2 = Dielectric (glass)
// 3 = Emissive (light source)

fn scatter_lambertian(
    normal: vec3f,
    seed: ptr<function, u32>,
    albedo: vec3f,
    scattered_dir: ptr<function, vec3f>,
    attenuation: ptr<function, vec3f>,
) -> bool {
    var dir = normal + random_unit_vector(seed);
    // Catch degenerate scatter direction
    if dot(dir, dir) < 0.0001 {
        dir = normal;
    }
    *scattered_dir = normalize(dir);
    *attenuation = albedo;
    return true;
}

fn reflect_vec(v: vec3f, n: vec3f) -> vec3f {
    return v - 2.0 * dot(v, n) * n;
}

fn refract_vec(uv: vec3f, n: vec3f, etai_over_etat: f32) -> vec3f {
    let cos_theta = min(dot(-uv, n), 1.0);
    let r_out_perp = etai_over_etat * (uv + cos_theta * n);
    let r_out_parallel = -sqrt(abs(1.0 - dot(r_out_perp, r_out_perp))) * n;
    return r_out_perp + r_out_parallel;
}

fn reflectance(cosine: f32, ref_idx: f32) -> f32 {
    // Schlick's approximation
    var r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow(1.0 - cosine, 5.0);
}

fn scatter_metal(
    ray_dir: vec3f,
    normal: vec3f,
    seed: ptr<function, u32>,
    albedo: vec3f,
    roughness: f32,
    scattered_dir: ptr<function, vec3f>,
    attenuation: ptr<function, vec3f>,
) -> bool {
    let reflected = reflect_vec(normalize(ray_dir), normal);
    *scattered_dir = normalize(reflected + roughness * random_in_unit_sphere(seed));
    *attenuation = albedo;
    return dot(*scattered_dir, normal) > 0.0;
}

fn scatter_dielectric(
    ray_dir: vec3f,
    normal: vec3f,
    front_face: bool,
    seed: ptr<function, u32>,
    ior: f32,
    scattered_dir: ptr<function, vec3f>,
    attenuation: ptr<function, vec3f>,
) -> bool {
    *attenuation = vec3f(1.0, 1.0, 1.0);
    var refraction_ratio: f32;
    if front_face {
        refraction_ratio = 1.0 / ior;
    } else {
        refraction_ratio = ior;
    }

    let unit_dir = normalize(ray_dir);
    let cos_theta = min(dot(-unit_dir, normal), 1.0);
    let sin_theta = sqrt(1.0 - cos_theta * cos_theta);
    let cannot_refract = refraction_ratio * sin_theta > 1.0;

    if cannot_refract || reflectance(cos_theta, refraction_ratio) > rand(seed) {
        *scattered_dir = reflect_vec(unit_dir, normal);
    } else {
        *scattered_dir = refract_vec(unit_dir, normal, refraction_ratio);
    }
    return true;
}
