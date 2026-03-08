// ─── Random Number Generation (PCG) ───
// Stateful RNG using PCG hash — each pixel gets its own seed

fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn rand(seed: ptr<function, u32>) -> f32 {
    *seed = pcg_hash(*seed);
    return f32(*seed) / 4294967295.0;
}

// ─── Sampling Utilities ───

fn random_in_unit_sphere(seed: ptr<function, u32>) -> vec3f {
    // Rejection sampling
    loop {
        let p = vec3f(
            rand(seed) * 2.0 - 1.0,
            rand(seed) * 2.0 - 1.0,
            rand(seed) * 2.0 - 1.0,
        );
        if dot(p, p) < 1.0 {
            return p;
        }
    }
}

fn random_unit_vector(seed: ptr<function, u32>) -> vec3f {
    return normalize(random_in_unit_sphere(seed));
}

fn random_in_hemisphere(normal: vec3f, seed: ptr<function, u32>) -> vec3f {
    let in_sphere = random_unit_vector(seed);
    if dot(in_sphere, normal) > 0.0 {
        return in_sphere;
    }
    return -in_sphere;
}
