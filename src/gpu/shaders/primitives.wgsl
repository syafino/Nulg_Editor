// ─── Primitive Intersection Functions ───

// ─── Box (AABB) Intersection ───
fn hit_box(
    center: vec3f,
    size: vec3f,
    ray: Ray,
    t_min: f32,
    t_max: f32,
    rec: ptr<function, HitRecord>,
) -> bool {
    let half_size = size * 0.5;
    let box_min = center - half_size;
    let box_max = center + half_size;

    // Compute intersection with AABB
    let dx = 1.0 / ray.direction.x;
    let dy = 1.0 / ray.direction.y;
    let dz = 1.0 / ray.direction.z;

    let t1 = (box_min.x - ray.origin.x) * dx;
    let t2 = (box_max.x - ray.origin.x) * dx;
    let t_min_x = min(t1, t2);
    let t_max_x = max(t1, t2);

    let t1y = (box_min.y - ray.origin.y) * dy;
    let t2y = (box_max.y - ray.origin.y) * dy;
    let t_min_y = min(t1y, t2y);
    let t_max_y = max(t1y, t2y);

    let t1z = (box_min.z - ray.origin.z) * dz;
    let t2z = (box_max.z - ray.origin.z) * dz;
    let t_min_z = min(t1z, t2z);
    let t_max_z = max(t1z, t2z);

    let t_enter = max(max(t_min_x, t_min_y), t_min_z);
    let t_exit = min(min(t_max_x, t_max_y), t_max_z);

    if t_enter >= t_exit {
        return false;
    }

    var t = t_enter;
    if t < t_min || t > t_max {
        t = t_exit;
        if t < t_min || t > t_max {
            return false;
        }
    }

    (*rec).t = t;
    (*rec).point = ray.origin + t * ray.direction;

    // Determine which face was hit and compute normal
    var normal = vec3f(0.0);
    let eps = 0.0001;

    if abs((*rec).point.x - box_min.x) < eps {
        normal = vec3f(-1.0, 0.0, 0.0);
    } else if abs((*rec).point.x - box_max.x) < eps {
        normal = vec3f(1.0, 0.0, 0.0);
    } else if abs((*rec).point.y - box_min.y) < eps {
        normal = vec3f(0.0, -1.0, 0.0);
    } else if abs((*rec).point.y - box_max.y) < eps {
        normal = vec3f(0.0, 1.0, 0.0);
    } else if abs((*rec).point.z - box_min.z) < eps {
        normal = vec3f(0.0, 0.0, -1.0);
    } else if abs((*rec).point.z - box_max.z) < eps {
        normal = vec3f(0.0, 0.0, 1.0);
    }

    (*rec).front_face = dot(ray.direction, normal) < 0.0;
    if !(*rec).front_face {
        normal = -normal;
    }
    (*rec).normal = normal;

    return true;
}

// ─── Plane Intersection ───
// Infinite plane defined by position and normal
fn hit_plane(
    position: vec3f,
    normal: vec3f,
    ray: Ray,
    t_min: f32,
    t_max: f32,
    rec: ptr<function, HitRecord>,
) -> bool {
    let denom = dot(normal, ray.direction);

    // Parallel or nearly parallel
    if abs(denom) < 0.0001 {
        return false;
    }

    let t = dot(position - ray.origin, normal) / denom;

    if t < t_min || t > t_max {
        return false;
    }

    (*rec).t = t;
    (*rec).point = ray.origin + t * ray.direction;
    (*rec).front_face = dot(ray.direction, normal) < 0.0;

    if (*rec).front_face {
        (*rec).normal = normal;
    } else {
        (*rec).normal = -normal;
    }

    return true;
}

// ─── Triangle Intersection ───
// Single triangle intersection using Möller–Trumbore algorithm
fn hit_triangle(
    v0: vec3f,
    v1: vec3f,
    v2: vec3f,
    ray: Ray,
    t_min: f32,
    t_max: f32,
    rec: ptr<function, HitRecord>,
) -> bool {
    let epsilon = 0.0000001;
    let edge1 = v1 - v0;
    let edge2 = v2 - v0;
    let h = cross(ray.direction, edge2);
    let a = dot(edge1, h);

    if abs(a) < epsilon {
        return false;
    }

    let f = 1.0 / a;
    let s = ray.origin - v0;
    let u = f * dot(s, h);

    if u < 0.0 || u > 1.0 {
        return false;
    }

    let q = cross(s, edge1);
    let v = f * dot(ray.direction, q);

    if v < 0.0 || u + v > 1.0 {
        return false;
    }

    let t = f * dot(edge2, q);

    if t < t_min || t > t_max {
        return false;
    }

    (*rec).t = t;
    (*rec).point = ray.origin + t * ray.direction;

    // Compute normal (cross product of edges)
    let normal = normalize(cross(edge1, edge2));
    (*rec).front_face = dot(ray.direction, normal) < 0.0;
    if (*rec).front_face {
        (*rec).normal = normal;
    } else {
        (*rec).normal = -normal;
    }

    return true;
}
