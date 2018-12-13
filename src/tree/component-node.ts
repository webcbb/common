import { ComponentContext } from '@wesib/wesib';
import { AIterable } from 'a-iterable';
import { ContextKey, SingleContextKey } from 'context-values';
import { EventProducer } from 'fun-events';

/**
 * Component node.
 *
 * Represents a position of the component within component tree.
 *
 * An instance of this class is available in component context under `[ComponentNode.key]`.
 *
 * @param <T> A type of component.
 */
export abstract class ComponentNode<T extends object = object> {

  /**
   * A key of component context value containing a component node instance.
   */
  static readonly key: ContextKey<ComponentNode<any>> = new SingleContextKey('component-node');

  /**
   * Component context.
   */
  abstract readonly context: ComponentContext<T>;

  /**
   * Parent component node, or `null` if the component has no parent.
   *
   * This is `null` when component's element is not connected.
   */
  abstract readonly parent: ComponentNode | null;

  /**
   * Event producer notifying on parent node updates. I.e. when parent components changed.
   */
  abstract readonly onParentUpdate: EventProducer<(this: void, parent: ComponentNode | null) => void>;

  /**
   * Select nested component nodes matching the given selector.
   *
   * @param selector Simple CSS selector of nested components. E.g. component element name.
   * @param opts Selector options.
   */
  abstract select<N extends object = object>(
      selector: string,
      opts?: ComponentNode.SelectorOpts): ComponentNodeList<N>;

}

export namespace ComponentNode {

  /**
   * Component node selector options.
   */
  export interface SelectorOpts {

    /**
     * Set to `true` to select from entire subtree. Otherwise - select from component child nodes only.
     */
    deep?: boolean;

  }

}

export abstract class ComponentNodeList<T extends object> extends AIterable<ComponentNode<T>> {

  abstract readonly onUpdate: EventProducer<(this: void, list: AIterable<ComponentNode<T>>) => void>;

}
