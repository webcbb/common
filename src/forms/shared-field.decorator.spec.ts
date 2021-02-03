import { InGroup, inGroup, inList, InList, inValue } from '@frontmeans/input-aspects';
import { trackValue, ValueTracker } from '@proc7ts/fun-events';
import { BootstrapContext, Component, ComponentClass, ComponentContext, ComponentSlot, FeatureDef } from '@wesib/wesib';
import { MockElement, testDefinition, testElement } from '../spec/test-element';
import { Field } from './field';
import { FieldName } from './field-name.definer';
import { FieldShare } from './field.share';
import { Form } from './form';
import { FormShare } from './form.share';
import { SharedField } from './shared-field.decorator';
import { SharedForm } from './shared-form.decorator';

describe('forms', () => {
  describe('@SharedField', () => {
    it('shares field', async () => {

      @Component('test-element', { extend: { type: MockElement } })
      class TestComponent {

        @SharedField()
        readonly field = new Field<string>(inValue('test'));

      }

      const element = new (await testElement(TestComponent))();
      const context = await ComponentSlot.of(element).whenReady;

      expect(await context.get(FieldShare)).toBeInstanceOf(Field);
    });
    it('adds field to enclosing form', async () => {

      const { formCtx, fieldCtx } = await bootstrap();

      const form = await formCtx.get(FormShare);
      const field = await fieldCtx.get(FieldShare);
      const controls = await form!.control.aspect(InGroup)!.controls.read;

      expect(controls.get('field')).toBe(field!.control);
    });
    it('adds field to enclosing form with custom name', async () => {

      @Component(
          'field-element',
          {
            extend: { type: MockElement },
          },
      )
      class FieldComponent {

        @SharedField({ name: 'customField' })
        readonly field = new Field<string>(inValue('test'));

      }

      const { formCtx, fieldCtx } = await bootstrap(FieldComponent);

      const form = await formCtx.get(FormShare);
      const field = await fieldCtx.get(FieldShare);
      const controls = await form!.control.aspect(InGroup)!.controls.read;

      expect(controls.get('field')).toBeUndefined();
      expect(controls.get('customField')).toBe(field!.control);
    });
    it('does not add field to enclosing form with empty name', async () => {

      @Component(
          'field-element',
          {
            extend: { type: MockElement },
          },
      )
      class FieldComponent {

        @SharedField({ name: '' })
        readonly field = new Field<string>(inValue('test'));

      }

      const { formCtx } = await bootstrap(FieldComponent);

      const form = await formCtx.get(FormShare);
      const controls = await form!.control.aspect(InGroup)!.controls.read;

      expect([...controls]).toHaveLength(0);
    });
    it('does not add a field under symbol key to enclosing', async () => {

      const symbol = Symbol('test');

      @Component(
          'field-element',
          {
            extend: { type: MockElement },
          },
      )
      class FieldComponent {

        @SharedField()
        readonly [symbol] = new Field<string>(inValue('test'));

      }

      const { formCtx } = await bootstrap(FieldComponent);

      const form = await formCtx.get(FormShare);
      const controls = await form!.control.aspect(InGroup)!.controls.read;

      expect([...controls]).toHaveLength(0);
    });
    it('does not add a field to non-group form', async () => {

      @Component(
          'form-element',
          {
            extend: { type: MockElement },
          },
      )
      class FormComponent {

        @SharedForm()
        readonly form: ValueTracker<Form>;

        constructor(context: ComponentContext) {
          this.form = trackValue(Form.forElement(inList([]), context.element));
        }

      }

      const { formCtx } = await bootstrap(undefined, FormComponent);

      const form = await formCtx.get(FormShare);
      const controls = await form!.control.aspect(InList)!.controls.read;

      expect([...controls]).toHaveLength(0);
    });

    describe('FieldName', () => {
      it('adds field to enclosing form', async () => {

        @Component(
            'field-element',
            {
              extend: { type: MockElement },
            },
        )
        class FieldComponent {

          @SharedField(
              {
                name: '',
              },
              FieldName(),
          )
          readonly field = new Field<string>(inValue('test'));

        }

        const { formCtx, fieldCtx } = await bootstrap(FieldComponent);

        const form = await formCtx.get(FormShare);
        const field = await fieldCtx.get(FieldShare);
        const controls = await form!.control.aspect(InGroup)!.controls.read;

        expect(controls.get('field')).toBe(field!.control);
      });
      it('adds field to enclosing form again', async () => {

        @Component(
            'field-element',
            {
              extend: { type: MockElement },
            },
        )
        class FieldComponent {

          @SharedField(
              {},
              FieldName({ name: 'customName' }),
          )
          readonly field = new Field<string>(inValue('test'));

        }

        const { formCtx, fieldCtx } = await bootstrap(FieldComponent);

        const form = await formCtx.get(FormShare);
        const field = await fieldCtx.get(FieldShare);
        const controls = await form!.control.aspect(InGroup)!.controls.read;

        expect(controls.get('field')).toBe(field!.control);
        expect(controls.get('customName')).toBe(field!.control);
      });
    });

    async function bootstrap(
        componentType?: ComponentClass,
        formComponentType?: ComponentClass,
    ): Promise<{
      formCtx: ComponentContext;
      fieldCtx: ComponentContext;
    }> {

      if (!formComponentType) {
        @Component(
            'form-element',
            {
              extend: { type: MockElement },
            },
        )
        class FormComponent {

          @SharedForm()
          readonly form: ValueTracker<Form>;

          constructor(context: ComponentContext) {
            this.form = trackValue(Form.forElement(inGroup({}), context.element));
          }

        }

        formComponentType = FormComponent;
      }

      if (!componentType) {
        @Component(
            'field-element',
            {
              extend: { type: MockElement },
            },
        )
        class FieldComponent {

          @SharedField()
          readonly field = new Field<string>(inValue('test'));

        }

        componentType = FieldComponent;
      }

      FeatureDef.define(componentType, { needs: formComponentType });

      const fieldDef = await testDefinition(componentType);
      const formDef = await fieldDef.get(BootstrapContext).whenDefined(formComponentType);

      const formEl = document.createElement('form-element');
      const fieldEl = formEl.appendChild(document.createElement('field-element'));

      return {
        formCtx: formDef.connectTo(formEl).context,
        fieldCtx: fieldDef.connectTo(fieldEl).context,
      };
    }
  });
});