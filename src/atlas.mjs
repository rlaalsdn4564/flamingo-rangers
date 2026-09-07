// Generated atlases are not exact grids. Isolate existing foreground components
// once into in-memory draw surfaces; the source RGBA PNGs remain untouched.
export function prepareAtlas(image, targets, makeCanvas) {
  const source = makeCanvas(image.width, image.height),
    context = source.getContext("2d");
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height),
    w = image.width,
    h = image.height;
  const labels = new Int32Array(w * h),
    queue = new Int32Array(w * h),
    components = [];
  let next = 0;
  for (let p = 0; p < w * h; p++) {
    if (labels[p] || data[p * 4 + 3] < 32) continue;
    const id = ++next;
    let start = 0,
      end = 1;
    queue[0] = p;
    labels[p] = id;
    let minX = w,
      minY = h,
      maxX = 0,
      maxY = 0,
      count = 0;
    while (start < end) {
      const at = queue[start++],
        x = at % w,
        y = (at / w) | 0;
      count++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const n of [
        x > 0 ? at - 1 : -1,
        x < w - 1 ? at + 1 : -1,
        y > 0 ? at - w : -1,
        y < h - 1 ? at + w : -1,
      ])
        if (n >= 0 && !labels[n] && data[n * 4 + 3] >= 32) {
          labels[n] = id;
          queue[end++] = n;
        }
    }
    if (count > 3000)
      components.push({
        id,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        count,
      });
  }
  const used = new Set();
  return targets.map((row) =>
    row.map(([tx, ty, tw, th, pivot]) => {
      const desiredX = tx + tw / 2,
        desiredY = ty + th / 2;
      const c = components
        .filter((item) => !used.has(item.id))
        .sort(
          (a, b) =>
            (a.x + a.w / 2 - desiredX) ** 2 +
            (a.y + a.h / 2 - desiredY) ** 2 -
            ((b.x + b.w / 2 - desiredX) ** 2 + (b.y + b.h / 2 - desiredY) ** 2),
        )[0];
      if (!c) throw new Error("Missing sprite component");
      used.add(c.id);
      const surface = makeCanvas(c.w, c.h),
        out = surface.getContext("2d"),
        pixels = out.createImageData(c.w, c.h);
      for (let yy = 0; yy < c.h; yy++)
        for (let xx = 0; xx < c.w; xx++) {
          const at = (yy + c.y) * w + xx + c.x;
          if (labels[at] !== c.id) continue;
          const index = (yy * c.w + xx) * 4;
          pixels.data.set(data.subarray(at * 4, at * 4 + 4), index);
        }
      out.putImageData(pixels, 0, 0);
      return {
        image: surface,
        width: c.w,
        height: c.h,
        pivot: pivot ?? c.w * 0.5,
        sourceRect: [c.x, c.y, c.w, c.h],
      };
    }),
  );
}
