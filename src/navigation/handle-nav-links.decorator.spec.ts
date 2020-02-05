import { bootstrapComponents, ComponentMount, Feature } from '@wesib/wesib';
import { trackValue, ValueTracker } from 'fun-events';
import { HandleNavLinks, HandleNavLinksDef } from './handle-nav-links.decorator';
import { Navigation } from './navigation';
import Mocked = jest.Mocked;

describe('navigation', () => {
  describe('@HandleNavLinks', () => {

    let element: Element;
    let anchor: HTMLAnchorElement;

    beforeEach(() => {
      element = document.body.appendChild(document.createElement('test-element'));
      anchor = element.appendChild(document.createElement('a'));
    });
    afterEach(() => {
      element.remove();
    });

    let mockNavigation: Mocked<Navigation>;
    let pageURL: ValueTracker<URL>;

    beforeEach(() => {
      pageURL = trackValue(new URL('http://localhost.localdomain:8888/current-page'));
      mockNavigation = {
        read: pageURL.read.thru_(url => ({ url })),
        open: jest.fn(),
      } as any;
    });

    it('navigates on anchor click instead of default action', async () => {
      anchor.href = '/test';
      await bootstrap();

      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(false);
      expect(mockNavigation.open).toHaveBeenCalledWith('/test');
    });
    it('handles click with default handler if anchor href is absent', async () => {
      await bootstrap();

      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(true);
      expect(mockNavigation.open).not.toHaveBeenCalled();
    });
    it('navigates using default anchor handler if its href has another origin', async () => {
      anchor.href = 'https://localhost.localdomain';
      await bootstrap();

      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(true);
      expect(mockNavigation.open).not.toHaveBeenCalled();
    });
    it('prevents navigation if href is the same as current page', async () => {
      anchor.href = pageURL.it.href;
      await bootstrap();

      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(false);
      expect(mockNavigation.open).not.toHaveBeenCalled();
    });
    it('handles expected event', async () => {
      anchor.href = '/test';
      await bootstrap({ event: 'test:click' });

      const event = new KeyboardEvent('test:click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(false);
      expect(mockNavigation.open).toHaveBeenCalledWith('/test');
    });
    it('does not handle unexpected event', async () => {
      anchor.href = '/test';
      await bootstrap({ event: 'test:click' });

      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      expect(anchor.dispatchEvent(event)).toBe(true);
      expect(mockNavigation.open).not.toHaveBeenCalled();
    });
    it('handles event using provided handler', async () => {

      const mockHandler = jest.fn();

      anchor.href = '/test';

      const { context } = await bootstrap({ handle: mockHandler });
      const event = new KeyboardEvent('click', { bubbles: true, cancelable: true });

      anchor.dispatchEvent(event);
      expect(mockHandler).toHaveBeenCalledWith({
        event,
        context,
        page: expect.objectContaining({ url: pageURL.it }),
        navigation: context.get(Navigation),
      });
    });

    async function bootstrap(def?: HandleNavLinksDef): Promise<ComponentMount> {

      @HandleNavLinks(def)
      @Feature({
        setup(setup) {
          setup.provide({ a: Navigation, is: mockNavigation });
        },
      })
      class TestComponent {}

      const bsContext = await new Promise(bootstrapComponents(TestComponent).whenReady);
      const factory = await bsContext.whenDefined(TestComponent);

      return factory.mountTo(element);
    }
  });
});
