import { BootstrapContext, BootstrapWindow } from '@wesib/wesib';
import { PageLoadAgent } from './page-load-agent';

/**
 * @internal
 */
export function pageTitleAgent(context: BootstrapContext): PageLoadAgent {

  const doc = context.get(BootstrapWindow).document;

  return next => next().thru_(response => {
    if (response.ok) {

      const title = response.document.getElementsByTagName('title').item(0);

      if (title && title.textContent) {
        doc.title = title.textContent;
      }
    }

    return response;
  });
}