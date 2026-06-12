export class Vec2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  add(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n: number) {
    this.x /= n;
    this.y /= n;
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }

  dist(v: Vec2) {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
  }
}
