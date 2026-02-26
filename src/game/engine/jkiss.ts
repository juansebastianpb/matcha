// Public domain code for 31-bit KISS generator.
// Adapted from panel-league (MIT) — https://github.com/frostburn/panel-league

const INT32_MASK_FULL = 4294967295
const INT32_MASK_POSITIVE = 2147483647

export class JKISS31 {
  x: number
  y: number
  z: number
  w: number
  c: number

  constructor() {
    this.x = 123456789
    this.y = 234567891
    this.z = 345678912
    this.w = 456789123
    this.c = 0
  }

  static get MAX_VALUE() {
    return INT32_MASK_POSITIVE
  }

  static unserialize(packet: string): JKISS31 {
    const params = JSON.parse(packet)
    const j = new JKISS31()
    j.x = params.x
    j.y = params.y
    j.z = params.z
    j.w = params.w
    j.c = params.c
    return j
  }

  serialize(): string {
    return JSON.stringify(this)
  }

  scramble(): void {
    this.x = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL
    this.y = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL
    this.z = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL
    this.w = (Math.random() * INT32_MASK_FULL) & INT32_MASK_FULL
    this.c = (Math.random() < 0.5 ? 1 : 0) & 1
  }

  step(): number {
    this.y ^= this.y << 5
    this.y ^= this.y >> 7
    this.y ^= this.y << 22
    const t = (this.z + this.w + this.c) & INT32_MASK_FULL
    this.z = this.w
    this.c = (t < 0 ? 1 : 0) & 1
    this.w = t & 2147483647
    this.x = (this.x + 1411392427) & INT32_MASK_FULL
    return (this.x + this.y + this.w) & INT32_MASK_POSITIVE
  }

  step01(): number {
    return this.step() / INT32_MASK_POSITIVE
  }
}
