import { ChangeDetectionStrategy, Component, ContentChild, ContentChildren, ElementRef, EventEmitter, NgZone, Optional, Output, Renderer, ViewEncapsulation, forwardRef } from '@angular/core';
import { swipeShouldReset } from '../../util/util';
import { Item } from './item';
import { List } from '../list/list';
import { Platform } from '../../platform/platform';
import { ItemOptions } from './item-options';
const /** @type {?} */ SWIPE_MARGIN = 30;
const /** @type {?} */ ELASTIC_FACTOR = 0.55;
const /** @type {?} */ ITEM_SIDE_FLAG_NONE = 0;
const /** @type {?} */ ITEM_SIDE_FLAG_LEFT = 1 << 0;
const /** @type {?} */ ITEM_SIDE_FLAG_RIGHT = 1 << 1;
const /** @type {?} */ ITEM_SIDE_FLAG_BOTH = ITEM_SIDE_FLAG_LEFT | ITEM_SIDE_FLAG_RIGHT;
/**
 * \@name ItemSliding
 * \@description
 * A sliding item is a list item that can be swiped to reveal buttons. It requires
 * an [Item](../Item) component as a child and a [List](../../list/List) component as
 * a parent. All buttons to reveal can be placed in the `<ion-item-options>` element.
 *
 * \@usage
 * ```html
 * <ion-list>
 *   <ion-item-sliding #item>
 *     <ion-item>
 *       Item
 *     </ion-item>
 *     <ion-item-options side="left">
 *       <button ion-button (click)="favorite(item)">Favorite</button>
 *       <button ion-button color="danger" (click)="share(item)">Share</button>
 *     </ion-item-options>
 *
 *     <ion-item-options side="right">
 *       <button ion-button (click)="unread(item)">Unread</button>
 *     </ion-item-options>
 *   </ion-item-sliding>
 * </ion-list>
 * ```
 *
 * ### Swipe Direction
 * By default, the buttons are revealed when the sliding item is swiped from right to left,
 * so the buttons are placed in the right side. But it's also possible to reveal them
 * in the right side (sliding from left to right) by setting the `side` attribute
 * on the `ion-item-options` element. Up to 2 `ion-item-options` can used at the same time
 * in order to reveal two different sets of buttons depending the swipping direction.
 *
 * ```html
 * <ion-item-options side="right">
 *   <button ion-button (click)="archive(item)">
 *     <ion-icon name="archive"></ion-icon>
 *     Archive
 *   </button>
 * </ion-item-options>
 *
 * <ion-item-options side="left">
 *   <button ion-button (click)="archive(item)">
 *     <ion-icon name="archive"></ion-icon>
 *     Archive
 *   </button>
 * </ion-item-options>
 * ```
 *
 * ### Listening for events (ionDrag) and (ionSwipe)
 * It's possible to know the current relative position of the sliding item by subscribing
 * to the (ionDrag)` event.
 *
 * ```html
 * <ion-item-sliding (ionDrag)="logDrag($event)">
 *   <ion-item>Item</ion-item>
 *   <ion-item-options>
 *     <button ion-button>Favorite</button>
 *   </ion-item-options>
 * </ion-item-sliding>
 * ```
 *
 * ### Button Layout
 * If an icon is placed with text in the option button, by default it will
 * display the icon on top of the text. This can be changed to display the icon
 * to the left of the text by setting `icon-start` as an attribute on the
 * `<ion-item-options>` element.
 *
 * ```html
 * <ion-item-options icon-start>
 *    <button ion-button (click)="archive(item)">
 *      <ion-icon name="archive"></ion-icon>
 *      Archive
 *    </button>
 *  </ion-item-options>
 *
 * ```
 *
 * ### Expandable Options
 *
 * Options can be expanded to take up the full width of the item if you swipe past
 * a certain point. This can be combined with the `ionSwipe` event to call methods
 * on the class.
 *
 * ```html
 *
 * <ion-item-sliding (ionSwipe)="delete(item)">
 *   <ion-item>Item</ion-item>
 *   <ion-item-options>
 *     <button ion-button expandable (click)="delete(item)">Delete</button>
 *   </ion-item-options>
 * </ion-item-sliding>
 * ```
 *
 * We can call `delete` by either clicking the button, or by doing a full swipe on the item.
 *
 * \@demo /docs/demos/src/item-sliding/
 * @see {\@link /docs/components#lists List Component Docs}
 * @see {\@link ../Item Item API Docs}
 * @see {\@link ../../list/List List API Docs}
 */
export class ItemSliding {
    /**
     * @param {?} list
     * @param {?} _plt
     * @param {?} _renderer
     * @param {?} _elementRef
     * @param {?} _zone
     */
    constructor(list, _plt, _renderer, _elementRef, _zone) {
        this._plt = _plt;
        this._renderer = _renderer;
        this._elementRef = _elementRef;
        this._zone = _zone;
        this._openAmount = 0;
        this._startX = 0;
        this._optsWidthRightSide = 0;
        this._optsWidthLeftSide = 0;
        this._tmr = null;
        this._optsDirty = true;
        this._state = 2 /* Disabled */;
        /**
         * \@output {event} Emitted when the sliding position changes.
         * It reports the relative position.
         *
         * ```ts
         * ondrag(item) {
         *   let percent = item.getSlidingPercent();
         *   if (percent > 0) {
         *     // positive
         *     console.log('right side');
         *   } else {
         *     // negative
         *     console.log('left side');
         *   }
         *   if (Math.abs(percent) > 1) {
         *     console.log('overscroll');
         *   }
         * }
         * ```
         *
         */
        this.ionDrag = new EventEmitter();
        list && list.containsSlidingItem(true);
        _elementRef.nativeElement.$ionComponent = this;
        this.setElementClass('item-wrapper', true);
    }
    /**
     * @param {?} itemOptions
     * @return {?}
     */
    set _itemOptions(itemOptions) {
        let /** @type {?} */ sides = 0;
        // Reset left and right options in case they were removed
        this._leftOptions = this._rightOptions = null;
        for (var /** @type {?} */ item of itemOptions.toArray()) {
            if (item.isRightSide()) {
                this._rightOptions = item;
                sides |= ITEM_SIDE_FLAG_RIGHT;
            }
            else {
                this._leftOptions = item;
                sides |= ITEM_SIDE_FLAG_LEFT;
            }
        }
        this._optsDirty = true;
        this._sides = sides;
    }
    /**
     * @hidden
     * @return {?}
     */
    getOpenAmount() {
        return this._openAmount;
    }
    /**
     * @hidden
     * @return {?}
     */
    getSlidingPercent() {
        const /** @type {?} */ openAmount = this._openAmount;
        if (openAmount > 0) {
            return openAmount / this._optsWidthRightSide;
        }
        else if (openAmount < 0) {
            return openAmount / this._optsWidthLeftSide;
        }
        else {
            return 0;
        }
    }
    /**
     * @hidden
     * @param {?} startX
     * @return {?}
     */
    startSliding(startX) {
        if (this._tmr) {
            this._plt.cancelTimeout(this._tmr);
            this._tmr = null;
        }
        if (this._openAmount === 0) {
            this._optsDirty = true;
            this._setState(4 /* Enabled */);
        }
        this._startX = startX + this._openAmount;
        this.item.setElementStyle(this._plt.Css.transition, 'none');
    }
    /**
     * @hidden
     * @param {?} x
     * @return {?}
     */
    moveSliding(x) {
        if (this._optsDirty) {
            this.calculateOptsWidth();
            return;
        }
        let /** @type {?} */ openAmount = (this._startX - x);
        switch (this._sides) {
            case ITEM_SIDE_FLAG_RIGHT:
                openAmount = Math.max(0, openAmount);
                break;
            case ITEM_SIDE_FLAG_LEFT:
                openAmount = Math.min(0, openAmount);
                break;
            case ITEM_SIDE_FLAG_BOTH: break;
            case ITEM_SIDE_FLAG_NONE: return;
            default:
                (void 0) /* assert */;
                break;
        }
        if (openAmount > this._optsWidthRightSide) {
            const /** @type {?} */ optsWidth = this._optsWidthRightSide;
            openAmount = optsWidth + (openAmount - optsWidth) * ELASTIC_FACTOR;
        }
        else if (openAmount < -this._optsWidthLeftSide) {
            const /** @type {?} */ optsWidth = -this._optsWidthLeftSide;
            openAmount = optsWidth + (openAmount - optsWidth) * ELASTIC_FACTOR;
        }
        this._setOpenAmount(openAmount, false);
        return openAmount;
    }
    /**
     * @hidden
     * @param {?} velocity
     * @return {?}
     */
    endSliding(velocity) {
        let /** @type {?} */ restingPoint = (this._openAmount > 0)
            ? this._optsWidthRightSide
            : -this._optsWidthLeftSide;
        // Check if the drag didn't clear the buttons mid-point
        // and we aren't moving fast enough to swipe open
        const /** @type {?} */ isResetDirection = (this._openAmount > 0) === !(velocity < 0);
        const /** @type {?} */ isMovingFast = Math.abs(velocity) > 0.3;
        const /** @type {?} */ isOnCloseZone = Math.abs(this._openAmount) < Math.abs(restingPoint / 2);
        if (swipeShouldReset(isResetDirection, isMovingFast, isOnCloseZone)) {
            restingPoint = 0;
        }
        this.fireSwipeEvent();
        this._setOpenAmount(restingPoint, true);
        return restingPoint;
    }
    /**
     * @hidden
     * @return {?}
     */
    fireSwipeEvent() {
        if (this._state & 32 /* SwipeRight */) {
            this._zone.run(() => this._rightOptions.ionSwipe.emit(this));
        }
        else if (this._state & 64 /* SwipeLeft */) {
            this._zone.run(() => this._leftOptions.ionSwipe.emit(this));
        }
    }
    /**
     * @hidden
     * @return {?}
     */
    calculateOptsWidth() {
        if (!this._optsDirty) {
            return;
        }
        this._optsWidthRightSide = 0;
        if (this._rightOptions) {
            this._optsWidthRightSide = this._rightOptions.width();
            (void 0) /* assert */;
        }
        this._optsWidthLeftSide = 0;
        if (this._leftOptions) {
            this._optsWidthLeftSide = this._leftOptions.width();
            (void 0) /* assert */;
        }
        this._optsDirty = false;
    }
    /**
     * @param {?} openAmount
     * @param {?} isFinal
     * @return {?}
     */
    _setOpenAmount(openAmount, isFinal) {
        const /** @type {?} */ platform = this._plt;
        if (this._tmr) {
            platform.cancelTimeout(this._tmr);
            this._tmr = null;
        }
        this._openAmount = openAmount;
        if (isFinal) {
            this.item.setElementStyle(platform.Css.transition, '');
        }
        if (openAmount > 0) {
            var /** @type {?} */ state = (openAmount >= (this._optsWidthRightSide + SWIPE_MARGIN))
                ? 8 /* Right */ | 32 /* SwipeRight */
                : 8 /* Right */;
            this._setState(state);
        }
        else if (openAmount < 0) {
            const /** @type {?} */ state = (openAmount <= (-this._optsWidthLeftSide - SWIPE_MARGIN))
                ? 16 /* Left */ | 64 /* SwipeLeft */
                : 16 /* Left */;
            this._setState(state);
        }
        else {
            (void 0) /* assert */;
            this._tmr = platform.timeout(() => {
                this._setState(2 /* Disabled */);
                this._tmr = null;
            }, 600);
            this.item.setElementStyle(platform.Css.transform, '');
            return;
        }
        this.item.setElementStyle(platform.Css.transform, `translate3d(${-openAmount}px,0,0)`);
        const /** @type {?} */ ionDrag = this.ionDrag;
        if (ionDrag.observers.length > 0) {
            ionDrag.emit(this);
        }
    }
    /**
     * @param {?} state
     * @return {?}
     */
    _setState(state) {
        if (state === this._state) {
            return;
        }
        this.setElementClass('active-slide', (state !== 2 /* Disabled */));
        this.setElementClass('active-options-right', !!(state & 8 /* Right */));
        this.setElementClass('active-options-left', !!(state & 16 /* Left */));
        this.setElementClass('active-swipe-right', !!(state & 32 /* SwipeRight */));
        this.setElementClass('active-swipe-left', !!(state & 64 /* SwipeLeft */));
        this._state = state;
    }
    /**
     * Close the sliding item. Items can also be closed from the [List](../../list/List).
     *
     * The sliding item can be closed by grabbing a reference to `ItemSliding`. In the
     * below example, the template reference variable `slidingItem` is placed on the element
     * and passed to the `share` method.
     *
     * ```html
     * <ion-list>
     *   <ion-item-sliding #slidingItem>
     *     <ion-item>
     *       Item
     *     </ion-item>
     *     <ion-item-options>
     *       <button ion-button (click)="share(slidingItem)">Share</button>
     *     </ion-item-options>
     *   </ion-item-sliding>
     * </ion-list>
     * ```
     *
     * ```ts
     * import { Component } from '\@angular/core';
     * import { ItemSliding } from 'ionic-angular';
     *
     * \@Component({...})
     * export class MyClass {
     *   constructor() { }
     *
     *   share(slidingItem: ItemSliding) {
     *     slidingItem.close();
     *   }
     * }
     * ```
     * @return {?}
     */
    close() {
        this._setOpenAmount(0, true);
    }
    /**
     * @hidden
     * @param {?} cssClass
     * @param {?} shouldAdd
     * @return {?}
     */
    setElementClass(cssClass, shouldAdd) {
        this._renderer.setElementClass(this._elementRef.nativeElement, cssClass, shouldAdd);
    }
}
ItemSliding.decorators = [
    { type: Component, args: [{
                selector: 'ion-item-sliding',
                template: `
    <ng-content select="ion-item,[ion-item]"></ng-content>
    <ng-content select="ion-item-options"></ng-content>
  `,
                changeDetection: ChangeDetectionStrategy.OnPush,
                encapsulation: ViewEncapsulation.None
            },] },
];
/**
 * @nocollapse
 */
ItemSliding.ctorParameters = () => [
    { type: List, decorators: [{ type: Optional },] },
    { type: Platform, },
    { type: Renderer, },
    { type: ElementRef, },
    { type: NgZone, },
];
ItemSliding.propDecorators = {
    'item': [{ type: ContentChild, args: [Item,] },],
    'ionDrag': [{ type: Output },],
    '_itemOptions': [{ type: ContentChildren, args: [forwardRef(() => ItemOptions),] },],
};
function ItemSliding_tsickle_Closure_declarations() {
    /** @type {?} */
    ItemSliding.decorators;
    /**
     * @nocollapse
     * @type {?}
     */
    ItemSliding.ctorParameters;
    /** @type {?} */
    ItemSliding.propDecorators;
    /** @type {?} */
    ItemSliding.prototype._openAmount;
    /** @type {?} */
    ItemSliding.prototype._startX;
    /** @type {?} */
    ItemSliding.prototype._optsWidthRightSide;
    /** @type {?} */
    ItemSliding.prototype._optsWidthLeftSide;
    /** @type {?} */
    ItemSliding.prototype._sides;
    /** @type {?} */
    ItemSliding.prototype._tmr;
    /** @type {?} */
    ItemSliding.prototype._leftOptions;
    /** @type {?} */
    ItemSliding.prototype._rightOptions;
    /** @type {?} */
    ItemSliding.prototype._optsDirty;
    /** @type {?} */
    ItemSliding.prototype._state;
    /**
     * @hidden
     * @type {?}
     */
    ItemSliding.prototype.item;
    /**
     * \@output {event} Emitted when the sliding position changes.
     * It reports the relative position.
     *
     * ```ts
     * ondrag(item) {
     *   let percent = item.getSlidingPercent();
     *   if (percent > 0) {
     *     // positive
     *     console.log('right side');
     *   } else {
     *     // negative
     *     console.log('left side');
     *   }
     *   if (Math.abs(percent) > 1) {
     *     console.log('overscroll');
     *   }
     * }
     * ```
     *
     * @type {?}
     */
    ItemSliding.prototype.ionDrag;
    /** @type {?} */
    ItemSliding.prototype._plt;
    /** @type {?} */
    ItemSliding.prototype._renderer;
    /** @type {?} */
    ItemSliding.prototype._elementRef;
    /** @type {?} */
    ItemSliding.prototype._zone;
}
//# sourceMappingURL=item-sliding.js.map