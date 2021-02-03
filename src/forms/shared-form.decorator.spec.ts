import { inGroup } from '@frontmeans/input-aspects';
import { trackValue, ValueTracker } from '@proc7ts/fun-events';
import { Component, ComponentContext, ComponentSlot } from '@wesib/wesib';
import { MockElement, testElement } from '../spec/test-element';
import { Form } from './form';
import { FormShare } from './form.share';
import { SharedForm } from './shared-form.decorator';

describe('forms', () => {
  describe('@SharedForm', () => {
    it('shares form', async () => {

      @Component('test-element', { extend: { type: MockElement } })
      class TestComponent {

        @SharedForm()
        readonly form: ValueTracker<Form>;

        constructor(context: ComponentContext) {
          this.form = trackValue(Form.forElement(inGroup({}), context.element));
        }

      }

      const element = new (await testElement(TestComponent))();
      const context = await ComponentSlot.of(element).whenReady;

      expect(await context.get(FormShare)).toBeInstanceOf(Form);
    });
  });
});