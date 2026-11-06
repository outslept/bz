function createBZ(width, height, alpha = 1.2, beta = 1.0, gamma = 1.0) {
    const size = width * height;
    const a0 = new Float32Array(size);
    const b0 = new Float32Array(size);
    const c0 = new Float32Array(size);
    const a1 = new Float32Array(size);
    const b1 = new Float32Array(size);
    const c1 = new Float32Array(size);

    for (let i = 0; i < size; i++) {
        a0[i] = Math.random();
        b0[i] = Math.random();
        c0[i] = Math.random();
    }

    const prevX = new Int32Array(width);
    const nextX = new Int32Array(width);
    for (let x = 0; x < width; x++) {
        prevX[x] = (x - 1 + width) % width;
        nextX[x] = (x + 1) % width;
    }

    const prevY = new Int32Array(height);
    const nextY = new Int32Array(height);
    for (let y = 0; y < height; y++) {
        prevY[y] = ((y - 1 + height) % height) * width;
        nextY[y] = ((y + 1) % height) * width;
    }

    return {
        width,
        height,
        size,
        alpha,
        beta,
        gamma,
        a: a0,
        b: b0,
        c: c0,
        nextA: a1,
        nextB: b1,
        nextC: c1,
        prevX,
        nextX,
        prevY,
        nextY,
        generation: 0,
        meanA: 0.5,
        meanB: 0.5
    };
}

function stepBZ(state) {
    const {
        width,
        height,
        size,
        alpha,
        beta,
        gamma,
        a,
        b,
        c,
        nextA,
        nextB,
        nextC,
        prevX,
        nextX,
        prevY,
        nextY
    } = state;

    const inv9 = 1 / 9;
    let sumA = 0;
    let sumB = 0;

    for (let y = 0; y < height; y++) {
        const row = y * width;
        const rowUp = prevY[y];
        const rowDown = nextY[y];

        for (let x = 0; x < width; x++) {
            const xl = prevX[x];
            const xr = nextX[x];

            const i00 = rowUp + xl;
            const i01 = rowUp + x;
            const i02 = rowUp + xr;
            const i10 = row + xl;
            const i11 = row + x;
            const i12 = row + xr;
            const i20 = rowDown + xl;
            const i21 = rowDown + x;
            const i22 = rowDown + xr;

            const avgA =
                (a[i00] + a[i01] + a[i02] + a[i10] + a[i11] + a[i12] + a[i20] + a[i21] + a[i22]) *
                inv9;
            const avgB =
                (b[i00] + b[i01] + b[i02] + b[i10] + b[i11] + b[i12] + b[i20] + b[i21] + b[i22]) *
                inv9;
            const avgC =
                (c[i00] + c[i01] + c[i02] + c[i10] + c[i11] + c[i12] + c[i20] + c[i21] + c[i22]) *
                inv9;

            let na = avgA + avgA * (alpha * avgB - gamma * avgC);
            let nb = avgB + avgB * (beta * avgC - alpha * avgA);
            let nc = avgC + avgC * (gamma * avgA - beta * avgB);

            if (na < 0) na = 0;
            else if (na > 1) na = 1;

            if (nb < 0) nb = 0;
            else if (nb > 1) nb = 1;

            if (nc < 0) nc = 0;
            else if (nc > 1) nc = 1;

            nextA[i11] = na;
            nextB[i11] = nb;
            nextC[i11] = nc;

            sumA += na;
            sumB += nb;
        }
    }

    state.a = nextA;
    state.b = nextB;
    state.c = nextC;
    state.nextA = a;
    state.nextB = b;
    state.nextC = c;
    state.generation++;
    state.meanA = sumA / size;
    state.meanB = sumB / size;
}

function injectWave(state, cx, cy, radius = 8) {
    const { width, height, a, b, c } = state;
    const rSq = radius * radius;
    const ix = cx | 0;
    const iy = cy | 0;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const dSq = dx * dx + dy * dy;
            if (dSq > rSq) continue;

            const x = (ix + dx + width) % width;
            const y = (iy + dy + height) % height;
            const idx = y * width + x;
            const falloff = 1 - Math.sqrt(dSq) / radius;

            a[idx] = Math.min(1, a[idx] + 0.85 * falloff);
            b[idx] = Math.max(0, b[idx] * (1 - 0.8 * falloff));
            c[idx] = Math.max(0, c[idx] * (1 - 0.5 * falloff));
        }
    }
}

function renderBZ(state, pixels) {
    const { size, a, b, c } = state;

    for (let i = 0; i < size; i++) {
        const va = a[i];
        const vb = b[i];
        const vc = c[i];

        const wave = Math.max(0, Math.min(1, (va - vb) * 1.35 + 0.5));
        const crest = Math.pow(va, 2.2);
        const ridge = Math.pow(vc * va, 1.4);

        const r = (10 + crest * 225 + ridge * 90 - vb * 20) | 0;
        const g = (10 + Math.pow(wave, 1.6) * 145 + crest * 75) | 0;
        const bl = (12 + wave * 215 + (1 - vb) * 45) | 0;

        const p = i << 2;
        pixels[p] = r < 0 ? 0 : r > 255 ? 255 : r;
        pixels[p + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        pixels[p + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        pixels[p + 3] = 255;
    }
}
