import { describe, expect, it } from 'vitest'

import { printReport } from './reportPrint'

type PrintEvent = 'beforeprint' | 'afterprint'

class FakePrintWindow {
  private listeners = new Map<PrintEvent, Set<() => void>>()
  onPrint: () => void = () => undefined

  addEventListener(type: PrintEvent, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: PrintEvent, listener: () => void) {
    this.listeners.get(type)?.delete(listener)
  }

  print() {
    this.onPrint()
  }

  dispatch(type: PrintEvent) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener()
    }
  }
}

describe('report print lifecycle', () => {
  it('giữ tên gợi ý cho tới khi phiên in kết thúc', () => {
    const targetWindow = new FakePrintWindow()
    const targetDocument = { title: 'MarketLens' }
    let titleObservedByPrint = ''
    targetWindow.onPrint = () => {
      titleObservedByPrint = targetDocument.title
    }

    printReport(
      'MarketLens_Bao-cao-kinh-doanh_202607',
      targetWindow,
      targetDocument,
    )

    expect(titleObservedByPrint).toBe(
      'MarketLens_Bao-cao-kinh-doanh_202607',
    )
    expect(targetDocument.title).toBe(
      'MarketLens_Bao-cao-kinh-doanh_202607',
    )

    targetDocument.title = 'changed-by-browser'
    targetWindow.dispatch('beforeprint')
    expect(targetDocument.title).toBe(
      'MarketLens_Bao-cao-kinh-doanh_202607',
    )

    targetWindow.dispatch('afterprint')
    expect(targetDocument.title).toBe('MarketLens')
  })

  it('khôi phục tiêu đề nếu trình duyệt không thể mở hộp thoại in', () => {
    const targetDocument = { title: 'MarketLens' }
    const targetWindow = new FakePrintWindow()
    targetWindow.onPrint = () => {
      throw new Error('print failed')
    }

    expect(() =>
      printReport('report-name', targetWindow, targetDocument),
    ).toThrow('print failed')
    expect(targetDocument.title).toBe('MarketLens')
  })
})
