import { BootstrapContext, bootstrapDefault, BootstrapWindow } from '@wesib/wesib';
import { ContextKey__symbol, SingleContextKey } from 'context-values';
import { AfterEvent, afterThe } from 'fun-events';
import { Navigation } from '../navigation';
import { PageLoadAgent } from './page-load-agent';
import { PageLoadURLModifier } from './page-load-url-modifier';

const PageCacheBuster__key = /*#__PURE__*/ new SingleContextKey<PageCacheBuster>(
    'page-cache-buster',
    {
      byDefault: bootstrapDefault(context => new PageCacheBuster(context)),
    },
);

/**
 * @internal
 */
export const appRevSearchParam = '__wesib_app_rev__';

/**
 * @internal
 */
export class PageCacheBuster {

  static get [ContextKey__symbol](): SingleContextKey<PageCacheBuster> {
    return PageCacheBuster__key;
  }

  readonly urlModifier: AfterEvent<PageLoadURLModifier[]>;
  readonly agent: AfterEvent<PageLoadAgent[]>;

  constructor(context: BootstrapContext) {

    const rev = appRev(context.get(BootstrapWindow).document);

    if (!rev) {
      this.urlModifier = afterThe();
      this.agent = afterThe();
    } else {

      const navigation = context.get(Navigation);

      this.urlModifier = afterThe(url => url.searchParams.set(appRevSearchParam, rev));
      this.agent = afterThe((next, request) => {
        return next(new Request(request.url, request)).thru_(response => {
          if (response.ok) {

            const newRev = appRev(response.document);

            if (newRev && newRev !== rev) {

              const url = new URL(response.page.url.href);

              url.searchParams.set(appRevSearchParam, newRev);
              navigation.update(url);
              navigation.reload();
            }
          }

          return response;
        });
      });
    }
  }

}

function appRev(doc: Document) {
  return doc.querySelector('meta[name=wesib-app-rev]')?.getAttribute('content');
}