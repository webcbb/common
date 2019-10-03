import { BootstrapContext, BootstrapWindow } from '@wesib/wesib';
import { DomEventDispatcher, trackValue } from 'fun-events';
import { NavigateEvent, PreNavigateEvent } from './navigate.event';
import { Navigation as Navigation_ } from './navigation';

const PRE_NAVIGATE_EVT = 'wesib:preNavigate';
const DONT_NAVIGATE_EVT = 'wesib:dontNavigate';
const NAVIGATE_EVT = 'wesib:navigate';

class NavigationLocation implements Navigation_.Location {

  readonly _url: URL;
  readonly data?: any;

  get url(): URL {
    return new URL(this._url.toString());
  }

  constructor({ url, data }: Navigation_.Location) {
    this._url = url;
    this.data = data;
  }

}

export function createNavigation(context: BootstrapContext): Navigation_ {

  const window = context.get(BootstrapWindow);
  const { document, location, history } = window;
  const dispatcher = new DomEventDispatcher(window);
  const preNavigate = dispatcher.on<PreNavigateEvent>(PRE_NAVIGATE_EVT);
  const dontNavigate = dispatcher.on<PreNavigateEvent>(DONT_NAVIGATE_EVT);
  const onNavigate = dispatcher.on<NavigateEvent>(NAVIGATE_EVT);
  const nav = trackValue<NavigationLocation>(new NavigationLocation({
    url: new URL(location.href),
    data: history.state,
  }));
  let next: Promise<any> = Promise.resolve();

  dispatcher.on<PopStateEvent>('popstate')(event => {

    const from = nav.it._url;
    const to = new URL(location.href);
    const newData = event.state;
    const oldData = nav.it.data;

    dispatcher.dispatch(
        new NavigateEvent(
            NAVIGATE_EVT,
            {
              action: 'return',
              from,
              to,
              oldData,
              newData,
            })
    );
    nav.it = new NavigationLocation({ url: to, data: newData });
  });

  class Navigation extends Navigation_ {

    get length() {
      return history.length;
    }

    get preNavigate() {
      return preNavigate;
    }

    get onNavigate() {
      return onNavigate;
    }

    get dontNavigate() {
      return dontNavigate;
    }

    get read() {
      return nav.read;
    }

    go(delta?: number): void {
      history.go(delta);
    }

    navigate(target: Navigation_.Target | string | URL) {
      return navigate('pre-navigate', 'navigate', 'pushState', target);
    }

    replace(target: Navigation_.Target | string | URL) {
      return navigate('pre-replace', 'replace', 'replaceState', target);
    }

  }

  return new Navigation();

  function toURL(url: string | URL): URL {
    if (typeof url === 'string') {
      return new URL(url, document.baseURI);
    }
    return url;
  }

  function navigate(
      preAction: 'pre-navigate' | 'pre-replace',
      action: 'navigate' | 'replace',
      method: 'pushState' | 'replaceState',
      target: Navigation_.Target | string | URL,
  ): Promise<boolean> {

    const promise = next = next.then(doNavigate, doNavigate);

    return promise;

    function doNavigate(): boolean {

      const { url, data, title = '' } = navigationTargetOf(target);
      const from = nav.it._url;
      const to = url != null ? toURL(url) : from;
      const init: NavigateEvent.Init<typeof preAction> = {
        action: preAction,
        from,
        to,
        oldData: nav.it.data,
        newData: data,
      };

      if (
          next !== promise
          || !dispatcher.dispatch(new NavigateEvent(PRE_NAVIGATE_EVT, init))
          || next !== promise) {
        dispatcher.dispatch(new NavigateEvent(DONT_NAVIGATE_EVT, init));
        return false; // Navigation cancelled
      }

      try {
        history[method](data, title, url && url.toString());
      } catch (e) {
        dispatcher.dispatch(new NavigateEvent(DONT_NAVIGATE_EVT, init));
        throw e;
      }
      nav.it = new NavigationLocation({ url: to, data });

      return dispatcher.dispatch(new NavigateEvent(NAVIGATE_EVT, { ...init, action }));
    }
  }
}

function navigationTargetOf(target: Navigation_.Target | string | URL): Navigation_.Target {
  return typeof target === 'string' || target instanceof URL ? { url: target } : target;
}
