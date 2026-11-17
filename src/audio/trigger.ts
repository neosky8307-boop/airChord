/**
 * 확정된 코드가 바뀌었을 때 소리를 낼지 결정한다.
 * - 같은 코드가 이어지는 동안은 다시 치지 않는다.
 * - 손이 사라졌다(null) 돌아오면 같은 코드라도 새로 친다.
 */
export class ChordTrigger {
  private last: string | null = null

  /** 새로 쳐야 하면 그 코드 id, 아니면 null */
  next(confirmed: string | null): string | null {
    if (confirmed === this.last) return null
    this.last = confirmed
    return confirmed
  }

  reset() {
    this.last = null
  }
}
