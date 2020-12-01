import {
  EventEmitter,
  EventReceiver,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
  ValueTracker,
} from '@proc7ts/fun-events';
import { ComponentContext, ComponentState, domPropertyPathTo } from '@wesib/wesib';

/**
 * @internal
 */
type ElementWithProperty<T> = {
  [key in PropertyKey]: T;
};

/**
 * @internal
 */
class PropertyTracker<T> extends ValueTracker<T> {

  private readonly _updates = new EventEmitter<[T, T]>();
  private readonly _key: string;

  constructor(
      private readonly _element: ElementWithProperty<T>,
      key: PropertyKey,
  ) {
    super();
    this._key = key as string;
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._updates);
  }

  get it(): T {
    return this._element[this._key];
  }

  set it(value: T) {
    this._element[this._key] = value;
  }

  on(): OnEvent<[T, T]>;
  on(receiver: EventReceiver<[T, T]>): EventSupply;
  on(receiver?: EventReceiver<[T, T]>): OnEvent<[T, T]> | EventSupply {
    return (this.on = this._updates.on().F)(receiver);
  }

  bind(context: ComponentContext): void {

    const propertyState = context.get(ComponentState).track(domPropertyPathTo(this._key));

    propertyState.onUpdate().to({
      supply: eventSupplyOf(this),
      receive: (_ctx, _path, newValue: any, oldValue: any) => this._updates.send(newValue, oldValue),
    });
  }

}

/**
 * @internal
 */
export class NodeProperties {

  private readonly _props = new Map<PropertyKey, PropertyTracker<any>>();
  private _context?: ComponentContext<any>;

  constructor(private readonly _element: any) {
  }

  bind(context: ComponentContext): void {
    this._context = context;
    this._props.forEach(prop => prop.bind(context));
  }

  get<T>(key: PropertyKey): ValueTracker<T> {

    const existing = this._props.get(key);

    if (existing) {
      return existing;
    }

    const created = new PropertyTracker<any>(this._element, key);

    if (this._context) {
      created.bind(this._context);
    }
    this._props.set(key, created);

    return created;
  }

}
