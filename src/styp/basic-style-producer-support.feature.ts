import { FeatureDef, FeatureDef__symbol } from '@wesib/wesib';
import { newNamespaceAliaser } from 'style-producer';
import { ComponentStyleProducer } from './component-style-producer';
import { ComponentStyleProducer as ComponentStyleProducer_ } from './component-style-producer.impl';
import { DefaultNamespaceAliaser } from './default-namespace-aliaser';

const BasicStyleProducerSupport__feature: FeatureDef = {
  set: {
    a: DefaultNamespaceAliaser,
    by: newNamespaceAliaser,
  },
  perComponent: [
    {
      as: ComponentStyleProducer_,
    },
    {
      a: ComponentStyleProducer,
      by(producer: ComponentStyleProducer_): ComponentStyleProducer {
        return (rules, opts) => producer.produce(rules, opts);
      },
      with: [ComponentStyleProducer_],
    },
  ],
};

/**
 * Basic style producer support feature.
 *
 * Depends on [style-producer].
 *
 * Unlike [[StyleProducerSupport]] feature this one does not enable default CSS renders.
 *
 * It is enabled automatically by `@ProduceStyle` decorator.
 *
 * [style-producer]: https://www.npmjs.com/package/style-producer
 */
export class BasicStyleProducerSupport {

  static get [FeatureDef__symbol]() {
    return BasicStyleProducerSupport__feature;
  }

}
