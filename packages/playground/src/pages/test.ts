/// <reference types=".vue-global-types/vine_vue_3.3_false" />

import { PageHeader } from '../components/page-header.vine'
import { InsideExample } from '../components/inside-example.vine'
import { generateRandomString } from '~/utils'

function OutsideExample(props: { id: string }) {
    vineStyle(scss`
    .loading-view {
      margin: 1rem 0;
    }
  `)
    vineStyle.scoped(`
    .state-container-meta {
      margin-top: 16px;
      font-style: italic;
    }
    .state-container-title {
      margin: 0.5rem 0;
      font-weight: bold;
      opacity: 0.8;
    }
  `)

    const randomStr = ref('')
    const loading = ref(true)
    const mockUpdate = () => {
        loading.value = true
        setTimeout(() => {
            loading.value = false
            randomStr.value = generateRandomString(30)
        }, 2000)
    }

    // Mock result of a network request
    watch(() => props.id, () => {
        mockUpdate()
    }, { immediate: true })




    {

        type __CTX_TYPES_FROM_FORMAL_PARAMS = { id: string };
        type __CTX_TYPES = __VINE_VLS_Expand<__VINE_VLS_Modify<
            __CTX_TYPES_FROM_BINDING,
            __CTX_TYPES_FROM_FORMAL_PARAMS
        >>;
        const __VINE_VLS_ctx = __createVineVLSCtx({
  /* __LINKED_CODE_LEFT__ */randomStr: /* __LINKED_CODE_RIGHT__ */randomStr,
  /* __LINKED_CODE_LEFT__ */loading: /* __LINKED_CODE_RIGHT__ */loading,
  /* __LINKED_CODE_LEFT__ */mockUpdate: /* __LINKED_CODE_RIGHT__ */mockUpdate,
  /* __LINKED_CODE_LEFT__ */PageHeader: /* __LINKED_CODE_RIGHT__ */PageHeader,
  /* __LINKED_CODE_LEFT__ */InsideExample: /* __LINKED_CODE_RIGHT__ */InsideExample,
  /* __LINKED_CODE_LEFT__ */generateRandomString: /* __LINKED_CODE_RIGHT__ */generateRandomString,
  /* __LINKED_CODE_LEFT__ */OutsideExample: /* __LINKED_CODE_RIGHT__ */OutsideExample,
  /* __LINKED_CODE_LEFT__ */RandomStringButton: /* __LINKED_CODE_RIGHT__ */RandomStringButton,
  /* __LINKED_CODE_LEFT__ */Home: /* __LINKED_CODE_RIGHT__ */Home,
            ...props as any as { id: string },
        });
        const __VINE_VLS_localComponents = __VINE_VLS_ctx;
        let __VINE_VLS_resolvedLocalAndGlobalComponents!: Required<{}
            & __VINE_VLS_WithComponent<'InsideExample', typeof __VINE_VLS_localComponents, "InsideExample", "InsideExample", "InsideExample">>;
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div, __VINE_VLS_intrinsicElements.div)({ ...{ class: ("state-container") }, });
        const __VINE_VLS_0 = __VINE_VLS_resolvedLocalAndGlobalComponents.InsideExample;
        /** @type { [typeof __VINE_VLS_components.InsideExample, ] } */
        // @ts-ignore
        InsideExample;
        // @ts-ignore
        const __VINE_VLS_1 = __VINE_VLS_asFunctionalComponent(__VINE_VLS_0, new __VINE_VLS_0({ ...{ 'onMetaBgColorChange': {} as any }, title: ("Here's a title"), author: ("ShenQingchuan"), }));
        const __VINE_VLS_2 = __VINE_VLS_1({ ...{ 'onMetaBgColorChange': {} as any }, title: ("Here's a title"), author: ("ShenQingchuan"), }, ...__VINE_VLS_functionalComponentArgsRest(__VINE_VLS_1));
        let __VINE_VLS_6!: __VINE_VLS_FunctionalComponentProps<typeof __VINE_VLS_1, typeof __VINE_VLS_2>;
        const __VINE_VLS_7: Record<string, unknown> & (
            __VINE_VLS_IsFunction<typeof __VINE_VLS_6, 'onMetaBgColorChange'> extends true
            ? typeof __VINE_VLS_6
            : __VINE_VLS_IsFunction<typeof __VINE_VLS_4, 'metaBgColorChange'> extends true
            ? {
                /**__VINE_VLS_emit,__VINE_VLS_3,metaBgColorChange*/
                onMetaBgColorChange?: typeof __VINE_VLS_4['metaBgColorChange']
            }
            : typeof __VINE_VLS_6
        ) = {
            onMetaBgColorChange: ((color: string) => console.log(color))
        };
        let __VINE_VLS_3!: typeof __VINE_VLS_5.emit;
        let __VINE_VLS_4!: __VINE_VLS_NormalizeEmits<typeof __VINE_VLS_3>;
        const __VINE_VLS_5 = __VINE_VLS_pickFunctionalComponentCtx(__VINE_VLS_0, __VINE_VLS_2);
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div, __VINE_VLS_intrinsicElements.div)({ ...{ class: ("state-container-title text-lime-800/50 dark:text-#999") }, });
        if (__VINE_VLS_ctx.loading) {
            __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div, __VINE_VLS_intrinsicElements.div)({ ...{ class: ("loading-view") }, });
            __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div)({ ...{ class: ("icon-loading") }, });
            // @ts-ignore
            [loading,];
            __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.span, __VINE_VLS_intrinsicElements.span)({});
        }
        else {
            __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.p, __VINE_VLS_intrinsicElements.p)({ ...{ class: ("state-container-meta") }, });
            (__VINE_VLS_ctx.randomStr);
            // @ts-ignore
            [randomStr,];
        }
        __VINE_VLS_styleScopedClasses['state-container'];
        __VINE_VLS_styleScopedClasses['state-container-title'];
        __VINE_VLS_styleScopedClasses['text-lime-800/50'];
        __VINE_VLS_styleScopedClasses['dark:text-#999'];
        __VINE_VLS_styleScopedClasses['loading-view'];
        __VINE_VLS_styleScopedClasses['icon-loading'];
        __VINE_VLS_styleScopedClasses['state-container-meta'];

        var __VINE_VLS_slots!: {
        };
        var __VINE_VLS_inheritedAttrs!: {};
        const __VINE_VLS_refs = {
        };
        var $refs!: typeof __VINE_VLS_refs;

    }
    return vine`` as any as __VINE_VLS_Element
}

function RandomStringButton(props: {}) {
    vineStyle(`
    .random-state-change-btn {
      font-size: 1rem;
      background: #334155c6;
      border-radius: 0.25rem;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      outline: none;
      cursor: pointer;
    }
  `)

    const emit = vineEmits<{
        tap: [number, number],
        move: [number, number, number]
    }>()
    // const emit = vineEmits(['tap', 'move'])

    const onBtnTap = (event: MouseEvent) => {
        const mouseX = event.clientX
        const mouseY = event.clientY
        emit('tap', mouseX, mouseY)
    }




    {

        type __CTX_TYPES_FROM_FORMAL_PARAMS = {};
        type __CTX_TYPES = __VINE_VLS_Expand<__VINE_VLS_Modify<
            __CTX_TYPES_FROM_BINDING,
            __CTX_TYPES_FROM_FORMAL_PARAMS
        >>;
        const __VINE_VLS_ctx = __createVineVLSCtx({
  /* __LINKED_CODE_LEFT__ */emit: /* __LINKED_CODE_RIGHT__ */emit,
  /* __LINKED_CODE_LEFT__ */onBtnTap: /* __LINKED_CODE_RIGHT__ */onBtnTap,
  /* __LINKED_CODE_LEFT__ */PageHeader: /* __LINKED_CODE_RIGHT__ */PageHeader,
  /* __LINKED_CODE_LEFT__ */InsideExample: /* __LINKED_CODE_RIGHT__ */InsideExample,
  /* __LINKED_CODE_LEFT__ */generateRandomString: /* __LINKED_CODE_RIGHT__ */generateRandomString,
  /* __LINKED_CODE_LEFT__ */OutsideExample: /* __LINKED_CODE_RIGHT__ */OutsideExample,
  /* __LINKED_CODE_LEFT__ */RandomStringButton: /* __LINKED_CODE_RIGHT__ */RandomStringButton,
  /* __LINKED_CODE_LEFT__ */Home: /* __LINKED_CODE_RIGHT__ */Home,
            ...props as any as {},
        });
        const __VINE_VLS_localComponents = __VINE_VLS_ctx;
        let __VINE_VLS_resolvedLocalAndGlobalComponents!: Required<{}>;
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.button, __VINE_VLS_intrinsicElements.button)({ ...{ onClick: (__VINE_VLS_ctx.onBtnTap) }, ...{ class: ("random-state-change-btn") }, });
        // @ts-ignore
        [onBtnTap,];
        __VINE_VLS_styleScopedClasses['random-state-change-btn'];

        var __VINE_VLS_slots!: {
        };
        var __VINE_VLS_inheritedAttrs!: {};
        const __VINE_VLS_refs = {
        };
        var $refs!: typeof __VINE_VLS_refs;

    }
    return vine`` as any as __VINE_VLS_Element
}

export function Home(props: {}) {
    const id = ref('1')
    const isDark = useDark()
    const toggleDark = useToggle(isDark)
    const randomState = () => {
        id.value = String(Math.floor(Math.random() * 100) + 1)
    }
    const userInputText = vineModel<string>()

    console.log('%c VINE %c Click the link to explore source code ->', 'background: green;', '')





    {

        type __CTX_TYPES_FROM_FORMAL_PARAMS = {};
        type __CTX_TYPES = __VINE_VLS_Expand<__VINE_VLS_Modify<
            __CTX_TYPES_FROM_BINDING,
            __CTX_TYPES_FROM_FORMAL_PARAMS
        >>;
        const __VINE_VLS_ctx = __createVineVLSCtx({
  /* __LINKED_CODE_LEFT__ */userInputText: /* __LINKED_CODE_RIGHT__ */userInputText,
  /* __LINKED_CODE_LEFT__ */id: /* __LINKED_CODE_RIGHT__ */id,
  /* __LINKED_CODE_LEFT__ */isDark: /* __LINKED_CODE_RIGHT__ */isDark,
  /* __LINKED_CODE_LEFT__ */toggleDark: /* __LINKED_CODE_RIGHT__ */toggleDark,
  /* __LINKED_CODE_LEFT__ */randomState: /* __LINKED_CODE_RIGHT__ */randomState,
  /* __LINKED_CODE_LEFT__ */PageHeader: /* __LINKED_CODE_RIGHT__ */PageHeader,
  /* __LINKED_CODE_LEFT__ */InsideExample: /* __LINKED_CODE_RIGHT__ */InsideExample,
  /* __LINKED_CODE_LEFT__ */generateRandomString: /* __LINKED_CODE_RIGHT__ */generateRandomString,
  /* __LINKED_CODE_LEFT__ */OutsideExample: /* __LINKED_CODE_RIGHT__ */OutsideExample,
  /* __LINKED_CODE_LEFT__ */RandomStringButton: /* __LINKED_CODE_RIGHT__ */RandomStringButton,
  /* __LINKED_CODE_LEFT__ */Home: /* __LINKED_CODE_RIGHT__ */Home,
            ...props as any as {},
        });
        const __VINE_VLS_localComponents = __VINE_VLS_ctx;
        let __VINE_VLS_resolvedLocalAndGlobalComponents!: Required<{}
            & __VINE_VLS_WithComponent<'PageHeader', typeof __VINE_VLS_localComponents, "PageHeader", "PageHeader", "PageHeader">
            & __VINE_VLS_WithComponent<'OutsideExample', typeof __VINE_VLS_localComponents, "OutsideExample", "OutsideExample", "OutsideExample">
            & __VINE_VLS_WithComponent<'RandomStringButton', typeof __VINE_VLS_localComponents, "RandomStringButton", "RandomStringButton", "RandomStringButton">>;
        const __VINE_VLS_0 = __VINE_VLS_resolvedLocalAndGlobalComponents.PageHeader;
        /** @type { [typeof __VINE_VLS_components.PageHeader, ] } */
        // @ts-ignore
        PageHeader;
        // @ts-ignore
        const __VINE_VLS_1 = __VINE_VLS_asFunctionalComponent(__VINE_VLS_0, new __VINE_VLS_0({}));
        const __VINE_VLS_2 = __VINE_VLS_1({}, ...__VINE_VLS_functionalComponentArgsRest(__VINE_VLS_1));
        const __VINE_VLS_6 = __VINE_VLS_resolvedLocalAndGlobalComponents.OutsideExample;
        /** @type { [typeof __VINE_VLS_components.OutsideExample, ] } */
        // @ts-ignore
        OutsideExample;
        // @ts-ignore
        const __VINE_VLS_7 = __VINE_VLS_asFunctionalComponent(__VINE_VLS_6, new __VINE_VLS_6({ id: ((__VINE_VLS_ctx.id)), }));
        const __VINE_VLS_8 = __VINE_VLS_7({ id: ((__VINE_VLS_ctx.id)), }, ...__VINE_VLS_functionalComponentArgsRest(__VINE_VLS_7));
        // @ts-ignore
        [id,];
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div, __VINE_VLS_intrinsicElements.div)({ ...{ class: ("flex flex-row items-center justify-center my-4") }, });
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div)({
            ...{
                onClick: (...[$event]) => {
                    __VINE_VLS_ctx.toggleDark();
                    // @ts-ignore
                    [toggleDark,];
                }
            }, ...{
                class: (([
                    __VINE_VLS_ctx.isDark ? 'i-carbon:moon' : 'i-carbon:sun',
                    'mr-2 text-6 cursor-pointer']
                ))
            },
        });
        // @ts-ignore
        [isDark,];
        const __VINE_VLS_12 = __VINE_VLS_resolvedLocalAndGlobalComponents.RandomStringButton;
        /** @type { [typeof __VINE_VLS_components.RandomStringButton, ] } */
        // @ts-ignore
        RandomStringButton;
        // @ts-ignore
        const __VINE_VLS_13 = __VINE_VLS_asFunctionalComponent(__VINE_VLS_12, new __VINE_VLS_12({ ...{ 'onTap': {} as any }, }));
        const __VINE_VLS_14 = __VINE_VLS_13({ ...{ 'onTap': {} as any }, }, ...__VINE_VLS_functionalComponentArgsRest(__VINE_VLS_13));
        let __VINE_VLS_18!: __VINE_VLS_FunctionalComponentProps<typeof __VINE_VLS_13, typeof __VINE_VLS_14>;
        const __VINE_VLS_19: Record<string, unknown> & (
            __VINE_VLS_IsFunction<typeof __VINE_VLS_18, 'onTap'> extends true
            ? typeof __VINE_VLS_18
            : __VINE_VLS_IsFunction<typeof __VINE_VLS_16, 'tap'> extends true
            ? {
                /**__VINE_VLS_emit,__VINE_VLS_15,tap*/
                onTap?: typeof __VINE_VLS_16['tap']
            }
            : typeof __VINE_VLS_18
        ) = {
            onTap: (__VINE_VLS_ctx.randomState)
        };
        let __VINE_VLS_15!: typeof __VINE_VLS_17.emit;
        let __VINE_VLS_16!: __VINE_VLS_NormalizeEmits<typeof __VINE_VLS_15>;
        // @ts-ignore
        [randomState,];
        const __VINE_VLS_17 = __VINE_VLS_pickFunctionalComponentCtx(__VINE_VLS_12, __VINE_VLS_14);
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.div, __VINE_VLS_intrinsicElements.div)({ ...{ class: ("flex flex-col items-center justify-center my-4") }, });
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.p, __VINE_VLS_intrinsicElements.p)({ ...{ class: ("my-4") }, });
        (__VINE_VLS_ctx.userInputText || 'Please input something here...');
        // @ts-ignore
        [userInputText,];
        __VINE_VLS_elementAsFunction(__VINE_VLS_intrinsicElements.input)({ type: ("text"), ...{ class: ("\u000a\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0062\u0067\u002d\u0062\u006c\u0075\u0065\u0047\u0072\u0061\u0079\u002d\u0032\u0030\u0030\u003a\u0038\u0030\u0020\u0064\u0061\u0072\u006b\u003a\u0062\u0067\u002d\u0063\u006f\u006f\u006c\u0067\u0072\u0061\u0079\u002d\u0034\u0030\u0030\u003a\u0032\u0030\u000a\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0064\u0061\u0072\u006b\u003a\u0063\u0061\u0072\u0065\u0074\u002d\u006c\u0069\u0067\u0068\u0074\u0020\u0062\u006f\u0072\u0064\u0065\u0072\u002d\u006e\u006f\u006e\u0065\u0020\u006f\u0075\u0074\u006c\u0069\u006e\u0065\u002d\u006e\u006f\u006e\u0065\u0020\u0070\u002d\u0032\u000a\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0064\u0061\u0072\u006b\u003a\u0074\u0065\u0078\u0074\u002d\u006c\u0069\u0067\u0068\u0074\u0020\u0072\u006f\u0075\u006e\u0064\u0065\u0064\u0020\u0077\u002d\u0033\u0030\u0030\u0070\u0078\u000a\u0020\u0020\u0020\u0020\u0020\u0020\u0020\u0020") }, value: ((__VINE_VLS_ctx.userInputText)), });
        // @ts-ignore
        [userInputText,];
        __VINE_VLS_styleScopedClasses['flex'];
        __VINE_VLS_styleScopedClasses['flex-row'];
        __VINE_VLS_styleScopedClasses['items-center'];
        __VINE_VLS_styleScopedClasses['justify-center'];
        __VINE_VLS_styleScopedClasses['my-4'];
        __VINE_VLS_styleScopedClasses['mr-2'];
        __VINE_VLS_styleScopedClasses['text-6'];
        __VINE_VLS_styleScopedClasses['cursor-pointer'];
        __VINE_VLS_styleScopedClasses['flex'];
        __VINE_VLS_styleScopedClasses['flex-col'];
        __VINE_VLS_styleScopedClasses['items-center'];
        __VINE_VLS_styleScopedClasses['justify-center'];
        __VINE_VLS_styleScopedClasses['my-4'];
        __VINE_VLS_styleScopedClasses['my-4'];
        __VINE_VLS_styleScopedClasses['bg-blueGray-200:80'];
        __VINE_VLS_styleScopedClasses['dark:bg-coolgray-400:20'];
        __VINE_VLS_styleScopedClasses['dark:caret-light'];
        __VINE_VLS_styleScopedClasses['border-none'];
        __VINE_VLS_styleScopedClasses['outline-none'];
        __VINE_VLS_styleScopedClasses['p-2'];
        __VINE_VLS_styleScopedClasses['dark:text-light'];
        __VINE_VLS_styleScopedClasses['rounded'];
        __VINE_VLS_styleScopedClasses['w-300px'];

        var __VINE_VLS_slots!: {
        };
        var __VINE_VLS_inheritedAttrs!: {};
        const __VINE_VLS_refs = {
        };
        var $refs!: typeof __VINE_VLS_refs;

    }
    return vine`` as any as __VINE_VLS_Element
}
