export function nestedCanScroll(target: EventTarget | null, delta: number) {
    let element = target instanceof Element ? target : null;
    if (element?.closest('input,textarea,select,[contenteditable="true"],dialog[open]')) return true;
    // Empty scene areas can target <html> directly. The page scroller is not
    // a nested container: guided input must handle it just like chapter copy.
    while (element && element !== document.body && element !== document.documentElement && element !== document.scrollingElement) {
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 2 &&
          (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 2)) return true;
      element = element.parentElement;
    }
    return false;
  }

