export function createScrollableContainer() {
  return (() => {
    const SHOW_BUTTONS = { NEVER: "never", ALWAYS: "always", ON_HOVER: "on-hover" };
    const SCROLLING_METHOD = { BY_RATIO: "by-ratio", SNAP: "snap" };
    const EDGE_GRADIENTS = { NONE: "none", MASK: "mask", LINEAR_GRADIENT: "linear-gradient" };
    const DIRECTION = { START: -1, END: 1 };

    const CHEVRON_LEFT = '<path d="M11.521 1.38l-.65-.76L2.23 8l8.641 7.38.65-.76L3.77 8z"/>';
    const CHEVRON_RIGHT = '<path d="M5.129.62l-.65.76L12.231 8l-7.752 6.62.65.76L13.771 8z"/>';
    let stylesInjected = false;

    function injectStyles() {
      if (stylesInjected) return;
      stylesInjected = true;
      const style = document.createElement("style");
      style.className = "spicetify-scrollable-container";
      style.textContent = `
.spicetify-sc-contentArea { overflow: hidden; position: relative; }
.spicetify-sc-scroller { display: flex; align-items: center; overflow-x: auto; scrollbar-width: none; white-space: nowrap; width: 100%; -ms-overflow-style: none; overscroll-behavior-x: contain; will-change: transform; }
@media (prefers-reduced-motion: no-preference) { .spicetify-sc-scroller { scroll-behavior: smooth; } }
.spicetify-sc-scroller::-webkit-scrollbar { display: none; }
.spicetify-sc-scroller.spicetify-sc-snap { scroll-snap-type: inline mandatory; }
.spicetify-sc-scroller.spicetify-sc-snap .spicetify-sc-snapCenter [data-carousel-item] { scroll-snap-align: center; }
.spicetify-sc-scroller.spicetify-sc-snap .spicetify-sc-snapStart [data-carousel-item] { scroll-snap-align: start; }
.spicetify-sc-scroller.spicetify-sc-wheelEnabled { overscroll-behavior: contain; }
.spicetify-sc-scroller.spicetify-sc-maskGradient { --sc-start-color: #000; --sc-end-color: #000; -webkit-mask-composite: source-in, xor; mask-composite: intersect; -webkit-mask-image: linear-gradient(90deg, var(--sc-start-color) 0, #000 120px), linear-gradient(90deg, #000 calc(100% - 120px), var(--sc-end-color) 100%); mask-image: linear-gradient(90deg, var(--sc-start-color) 0, #000 120px), linear-gradient(90deg, #000 calc(100% - 120px), var(--sc-end-color) 100%); -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
.spicetify-sc-scroller.spicetify-sc-maskGradient.spicetify-sc-maskStart { --sc-start-color: transparent; }
.spicetify-sc-scroller.spicetify-sc-maskGradient.spicetify-sc-maskEnd { --sc-end-color: transparent; }
.spicetify-sc-linearGradient::before, .spicetify-sc-linearGradient::after { bottom: 0; content: ""; height: 100%; opacity: 0; pointer-events: none; position: absolute; top: 0; transition: opacity .15s ease-out; width: 120px; z-index: 2; }
.spicetify-sc-linearGradient::before { background: linear-gradient(90deg, var(--carousel-start-chevron-gradient, var(--spice-main)) 0, transparent 100%); inset-inline-start: 0; }
.spicetify-sc-linearGradient::after { background: linear-gradient(-90deg, var(--carousel-end-chevron-gradient, var(--spice-main)) 0, transparent 100%); inset-inline-end: 0; }
.spicetify-sc-linearGradient.spicetify-sc-lgStart::before { opacity: 1; }
.spicetify-sc-linearGradient.spicetify-sc-lgEnd::after { opacity: 1; }
.spicetify-sc-carousel { bottom: 0; left: 0; position: absolute; right: 0; top: 0; justify-content: space-between; align-items: center; display: flex; pointer-events: none; }
.spicetify-sc-chevronBtn { display: flex; border: none; border-radius: 50%; cursor: pointer; justify-content: center; align-items: center; backdrop-filter: var(--chevrons-button-backdrop-filter, none); background: transparent; background-color: var(--chevrons-button-color, var(--background-elevated-base)); height: 24px; opacity: 0; position: relative; transition: color .15s ease-out, opacity .15s ease-out, background-color .15s ease-out, translate .15s ease-out; translate: 0; width: 24px; z-index: 3; pointer-events: none; color: var(--text-base, #fff); }
.spicetify-sc-chevronBtn > * { opacity: .7; z-index: 2; }
.spicetify-sc-chevronBtn:hover { background-color: var(--chevrons-button-hover-color, var(--background-elevated-highlight)); }
.spicetify-sc-chevronBtn:hover > * { opacity: 1; }
.spicetify-sc-chevronBtn.spicetify-sc-chevronVisible { opacity: 1; pointer-events: auto; }
.spicetify-sc-onHover .spicetify-sc-chevronBtn { opacity: 0; }
.spicetify-sc-contentArea:hover .spicetify-sc-onHover .spicetify-sc-chevronBtn.spicetify-sc-chevronVisible { opacity: 1; }
.spicetify-sc-contentArea:hover .spicetify-sc-onHover .spicetify-sc-chevronStart.spicetify-sc-chevronVisible { translate: 8px; }
.spicetify-sc-contentArea:hover .spicetify-sc-onHover .spicetify-sc-chevronEnd.spicetify-sc-chevronVisible { translate: -8px; }
.spicetify-sc-scroller > div[role="presentation"] > button { margin-inline-start: 0px !important; }
body[data-dragging-uri-type] .spicetify-sc-chevronBtn { pointer-events: none; }`;
      document.head.appendChild(style);
    }

    function useDragToScroll({ isDisabled = true } = {}) {
      const { useRef, useCallback } = Spicetify.React;
      const frameRef = useRef(0);
      const savedBehavior = useRef(null);
      const savedSnapType = useRef(null);

      return useCallback(
        ({ currentTarget, clientX }) => {
          if (isDisabled || !(currentTarget instanceof HTMLElement)) return;
          const el = currentTarget;

          const restore = () => {
            el.style.removeProperty("user-select");
            if (savedBehavior.current !== null) el.style.scrollBehavior = savedBehavior.current;
            if (savedSnapType.current !== null) el.style.scrollSnapType = savedSnapType.current;
          };
          const fullCleanup = () => {
            cancelAnimationFrame(frameRef.current);
            restore();
          };

          fullCleanup();
          const computed = window.getComputedStyle(el);
          savedBehavior.current = computed.scrollBehavior;
          savedSnapType.current = computed.scrollSnapType;
          el.style.userSelect = "none";
          el.style.scrollBehavior = "auto";
          el.style.scrollSnapType = "none";

          let dragged = false;
          const startScroll = el.scrollLeft;
          const startX = clientX;
          let velocity = 0;

          const coast = () => {
            el.scrollLeft += velocity;
            velocity *= 0.95;
            if (Math.abs(velocity) > 0.5) frameRef.current = requestAnimationFrame(coast);
            else fullCleanup();
          };

          const onMove = (e) => {
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 10) dragged = true;
            const prev = el.scrollLeft;
            el.scrollLeft = startScroll - dx;
            velocity = el.scrollLeft - prev;
          };

          document.addEventListener("mousemove", onMove);
          document.addEventListener(
            "mouseup",
            () => {
              if (dragged) {
                const block = (e) => {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                };
                el.addEventListener("click", block, { once: true, capture: true });
                setTimeout(() => el.removeEventListener("click", block, { capture: true }));
              }
              document.removeEventListener("mousemove", onMove);
              cancelAnimationFrame(frameRef.current);
              frameRef.current = requestAnimationFrame(coast);
              document.addEventListener("wheel", fullCleanup, { once: true });
            },
            { once: true },
          );
        },
        [isDisabled],
      );
    }

    function useWheelScroll(onlyHorizontalWheel) {
      const { useRef, useCallback } = Spicetify.React;
      const isFirst = useRef(true);
      const savedBehavior = useRef(null);
      const timer = useRef(null);

      return useCallback(
        (e) => {
          if (!e.deltaY) return;
          if (onlyHorizontalWheel && Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
          const el = e.currentTarget;
          if (isFirst.current) {
            isFirst.current = false;
            savedBehavior.current = el.style.scrollBehavior;
            el.style.scrollBehavior = "auto";
          }

          el.scrollLeft += e.deltaY + e.deltaX;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            isFirst.current = true;
            el.style.scrollBehavior = savedBehavior.current ?? "";
          }, 100);
        },
        [onlyHorizontalWheel],
      );
    }

    function useScrollState(scrollerRef, contentRef) {
      const { useState, useCallback, useEffect } = Spicetify.React;
      const [canGoStart, setCanGoStart] = useState(false);
      const [canGoEnd, setCanGoEnd] = useState(false);

      const update = useCallback(() => {
        const el = scrollerRef.current;
        const child = contentRef.current;
        if (!el || !child) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        const pos = Math.abs(el.scrollLeft);
        const rounded = pos < 1 ? Math.floor(pos) : Math.ceil(pos);
        const overflows = child.offsetWidth > el.clientWidth;
        setCanGoStart(overflows && rounded !== 0);
        setCanGoEnd(overflows && rounded < maxScroll);
      }, [scrollerRef, contentRef]);

      useEffect(() => {
        const el = scrollerRef.current;
        const child = contentRef.current;
        if (!el || !child) return;

        update();
        el.addEventListener("scroll", update);
        const ro = new ResizeObserver(update);
        ro.observe(el);
        ro.observe(child);
        return () => {
          el.removeEventListener("scroll", update);
          ro.disconnect();
        };
      }, [update, scrollerRef, contentRef]);

      return { canGoStart, canGoEnd };
    }

    function ScrollableContainerComponent(props) {
      const { useRef, useCallback, useMemo } = Spicetify.React;
      const h = Spicetify.ReactJSX.jsx;
      const hsf = Spicetify.ReactJSX.jsxs;
      const cn = Spicetify.classnames;

      const {
        children,
        className,
        chevronsClassName,
        showButtons = SHOW_BUTTONS.ALWAYS,
        ariaLabel,
        onlyHorizontalWheel = false,
        wheelScrollEnabled = true,
        scrollContentClassName,
        scrollerClassName,
        scrollRatio = 0.9,
        scrollingMethod = SCROLLING_METHOD.BY_RATIO,
        scrollPadding,
        scrollSnapAlign,
        scrollSnapByItems = 1,
        edgeGradients = EDGE_GRADIENTS.MASK,
        dragToScrollOptions = { isDisabled: true },
        onScroll,
        activeElementThreshold = 10,
        onNavigationClick,
        role = "list",
      } = props;

      injectStyles();

      const scrollerRef = useRef(null);
      const contentRef = useRef(null);
      const lastIndex = useRef(-1);

      const { canGoStart, canGoEnd } = useScrollState(scrollerRef, contentRef);
      const dragHandler = useDragToScroll(dragToScrollOptions);
      const wheelHandler = useWheelScroll(onlyHorizontalWheel);
      const isRtl = useMemo(() => document.documentElement.dir === "rtl", []);

      const getActiveIndex = useCallback(() => {
        const scrollPos = Math.abs(scrollerRef.current?.scrollLeft ?? 0);
        let index = -1;
        if (contentRef.current?.children) {
          let idx = -1;
          for (const child of contentRef.current.children) {
            if (child instanceof HTMLElement) {
              idx++;
              if (Math.abs(child.offsetLeft - scrollPos) <= child.offsetWidth / activeElementThreshold) index = idx;
            }
          }
        }
        return index;
      }, [activeElementThreshold]);

      const fireScroll = useCallback(() => {
        if (!onScroll) return;
        const index = getActiveIndex();
        if (lastIndex.current !== index) {
          lastIndex.current = index;
          onScroll(index);
        }
      }, [getActiveIndex, onScroll]);

      const navigate = useCallback(
        (direction) => {
          if (!scrollerRef.current) return;
          const dir = isRtl ? -1 : 1;

          if (scrollingMethod === SCROLLING_METHOD.SNAP) {
            const item = contentRef.current?.querySelector("[data-carousel-item]");
            if (!item) return;
            scrollerRef.current.scrollBy({ left: dir * scrollSnapByItems * item.getBoundingClientRect().width * direction });
          } else scrollerRef.current.scrollBy({ left: dir * direction * scrollerRef.current.clientWidth * scrollRatio });

          fireScroll();
          onNavigationClick?.(direction);
        },
        [scrollingMethod, fireScroll, isRtl, scrollSnapByItems, scrollRatio, onNavigationClick],
      );

      const isSnap = scrollingMethod === SCROLLING_METHOD.SNAP;
      const isMask = edgeGradients === EDGE_GRADIENTS.MASK;
      const isLinearGradient = edgeGradients === EDGE_GRADIENTS.LINEAR_GRADIENT;

      const makeChevron = (svgPath, position, visible, dir) =>
        h("div", {
          className: cn("spicetify-sc-chevronBtn", `spicetify-sc-chevron${position}`, { "spicetify-sc-chevronVisible": visible }),
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(dir);
          },
          "aria-hidden": "true",
          children: h("svg", { height: 12, width: 12, viewBox: "0 0 16 16", fill: "currentColor", dangerouslySetInnerHTML: { __html: svgPath } }),
        });

      return hsf("div", {
        className: cn("spicetify-sc-contentArea", className, {
          "spicetify-sc-linearGradient": isLinearGradient,
          "spicetify-sc-lgStart": isLinearGradient && canGoStart,
          "spicetify-sc-lgEnd": isLinearGradient && canGoEnd,
        }),
        children: [
          h("div", {
            ref: scrollerRef,
            className: cn("spicetify-sc-scroller", scrollerClassName, {
              "spicetify-sc-snap": isSnap,
              "spicetify-sc-maskGradient": isMask,
              "spicetify-sc-wheelEnabled": wheelScrollEnabled,
              "spicetify-sc-maskStart": isMask && canGoStart,
              "spicetify-sc-maskEnd": isMask && canGoEnd,
            }),
            onScroll: onScroll ? fireScroll : undefined,
            onMouseDownCapture: dragHandler,
            onWheel: wheelScrollEnabled ? wheelHandler : undefined,
            role,
            "aria-label": ariaLabel,
            style: isSnap ? { scrollPadding } : undefined,
            children: h("div", {
              ref: contentRef,
              role: "presentation",
              className: cn(scrollContentClassName, {
                "spicetify-sc-snapStart": scrollSnapAlign === "start",
                "spicetify-sc-snapCenter": scrollSnapAlign === "center",
              }),
              children,
            }),
          }),
          showButtons !== SHOW_BUTTONS.NEVER &&
            hsf("div", {
              className: cn("spicetify-sc-carousel", chevronsClassName, {
                "spicetify-sc-onHover": showButtons === SHOW_BUTTONS.ON_HOVER,
              }),
              children: [makeChevron(CHEVRON_LEFT, "Start", canGoStart, DIRECTION.START), makeChevron(CHEVRON_RIGHT, "End", canGoEnd, DIRECTION.END)],
            }),
        ],
      });
    }

    ScrollableContainerComponent.SHOW_BUTTONS = SHOW_BUTTONS;
    ScrollableContainerComponent.SCROLLING_METHOD = SCROLLING_METHOD;
    ScrollableContainerComponent.EDGE_GRADIENTS = EDGE_GRADIENTS;
    ScrollableContainerComponent.DIRECTION = DIRECTION;

    return ScrollableContainerComponent;
  })();
}
