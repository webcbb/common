import { BootstrapContext, BootstrapWindow, mergeFunctions } from '@wesib/wesib';
import { noop } from 'call-thru';
import { AfterEvent, DomEventDispatcher, onEventFromAny, trackValue } from 'fun-events';
import { NavHistory, PageEntry } from './nav-history.impl';
import { Navigation as Navigation_ } from './navigation';
import { NavigationAgent } from './navigation-agent';
import {
  EnterPageEvent,
  LeavePageEvent,
  NavigationEvent,
  NavigationEventType,
  StayOnPageEvent,
} from './navigation.event';
import { Page } from './page';
import { PageParam } from './page-param';

export function createNavigation(context: BootstrapContext): Navigation_ {

  const window = context.get(BootstrapWindow);
  const { document, history } = window;
  const dispatcher = new DomEventDispatcher(window);
  const navHistory = context.get(NavHistory);
  const agent = context.get(NavigationAgent);
  const onEnter = dispatcher.on<EnterPageEvent>(NavigationEventType.EnterPage);
  const onLeave = dispatcher.on<LeavePageEvent>(NavigationEventType.LeavePage);
  const onStay = dispatcher.on<StayOnPageEvent>(NavigationEventType.StayOnPage);
  const onEvent = onEventFromAny<[NavigationEvent]>(onEnter, onLeave, onStay);
  const nav = trackValue<PageEntry>(navHistory.init());
  const readPage: AfterEvent<[Page]> = nav.read.keep.thru(entry => entry.page);
  let next: Promise<any> = Promise.resolve();

  dispatcher.on<PopStateEvent>('popstate')(event => {

    const entry = navHistory.return(nav.it, event);

    nav.it = entry;
    dispatcher.dispatch(new EnterPageEvent(
        NavigationEventType.EnterPage,
        {
          when: 'return',
          to: entry.page,
        },
    ));
  });

  class Navigation extends Navigation_ {

    get length() {
      return history.length;
    }

    get onEnter() {
      return onEnter;
    }

    get onLeave() {
      return onLeave;
    }

    get onStay() {
      return onStay;
    }

    get on() {
      return onEvent;
    }

    get read() {
      return readPage;
    }

    go(delta?: number): void {
      history.go(delta);
    }

    open(target: Navigation_.Target | string | URL) {
      return navigate('pre-open', 'open', target);
    }

    replace(target: Navigation_.Target | string | URL) {
      return navigate('pre-replace', 'replace', target);
    }

    with<T, O>(request: PageParam.Request<T, O>, options: O): Navigation_.Parameterized {
      return withParam(page => page.set(request, options));
    }

  }

  return new Navigation();

  function withParam(applyParams: (page: Page) => void): Navigation_.Parameterized {
    return {
      with<TT, OO>(request: PageParam.Request<TT, OO>, options: OO): Navigation_.Parameterized {
        return withParam(mergeFunctions(applyParams, page => page.set(request, options)));
      },
      open(target: Navigation_.Target | string | URL) {
        return navigate('pre-open', 'open', target, applyParams);
      },
      replace(target: Navigation_.Target | string | URL) {
        return navigate('pre-replace', 'replace', target, applyParams);
      },
    };
  }

  function toURL(url: string | URL | undefined): URL {
    if (typeof url === 'string') {
      return new URL(url, document.baseURI);
    }
    return url || nav.it.page.url;
  }

  function urlTargetOf(target: Navigation_.Target | string | URL): Navigation_.URLTarget {
    if (typeof target === 'string' || target instanceof URL) {
      return { url: toURL(target) };
    }
    if (target.url instanceof URL) {
      return target as Navigation_.URLTarget;
    }
    return { ...target, url: toURL(target.url) };
  }

  function navigate(
      whenLeave: 'pre-open' | 'pre-replace',
      when: 'open' | 'replace',
      target: Navigation_.Target | string | URL,
      applyParams: (page: Page) => void = noop,
  ): Promise<Page | null> {

    const urlTarget = urlTargetOf(target);
    const promise = next = next.then(doNavigate, doNavigate);

    return promise;

    function doNavigate(): Page | null {

      let fromEntry: PageEntry | undefined;
      let toEntry: PageEntry | undefined;

      try {

        const prepared = prepare();

        if (!prepared) {
          return prepared; // Navigation cancelled
        }

        [fromEntry, toEntry] = prepared;

        navHistory[when](fromEntry, toEntry);
      } catch (e) {
        stay(toEntry, e);
        throw e;
      }

      nav.it = toEntry;
      dispatcher.dispatch(new EnterPageEvent(
          NavigationEventType.EnterPage,
          {
            when,
            to: toEntry.page,
          },
      ));

      return toEntry.page;
    }

    function prepare(): [PageEntry, PageEntry] | null {
      if (next !== promise) {
        return stay();
      }

      const fromEntry = nav.it;
      const toEntry = navHistory.newEntry(urlTarget);

      fromEntry.transfer(toEntry, whenLeave);

      const leavePage = new LeavePageEvent(
          NavigationEventType.LeavePage,
          {
            when: whenLeave,
            from: fromEntry.page,
            to: toEntry.page,
          },
      );

      applyParams(toEntry.page);
      if (!dispatcher.dispatch(leavePage) || next !== promise) {
        return stay(toEntry);
      }

      let finalTarget: Navigation_.URLTarget | undefined;

      agent(t => finalTarget = t, whenLeave, leavePage.from, leavePage.to);

      if (!finalTarget) {
        return stay(toEntry); // Some agent didn't call `next()`.
      }

      return [
        fromEntry,
        toEntry,
      ];
    }

    function stay(toEntry?: PageEntry, reason?: any): null {
      if (toEntry) {
        toEntry.stay(nav.it.page);
      }

      dispatcher.dispatch(new StayOnPageEvent(
          NavigationEventType.StayOnPage,
          {
            from: nav.it.page,
            to: urlTarget,
            reason,
          },
      ));

      return null;
    }

  }
}
