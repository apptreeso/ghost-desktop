import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { ProfileService } from 'app/core/market/api/profile/profile.service';
import { ListingService } from 'app/core/market/api/listing/listing.service';
import { CartService } from 'app/core/market/api/cart/cart.service';
import { FavoritesService } from 'app/core/market/api/favorites/favorites.service';

@Component({
  selector: 'app-buy',
  templateUrl: './buy.component.html',
  styleUrls: ['./buy.component.scss']
})
export class BuyComponent implements OnInit {

  public selectedTab: number = 0;
  public tabLabels: Array<string> = ['cart', 'orders', 'favourites'];

  /* https://material.angular.io/components/stepper/overview */
  cartFormGroup: FormGroup;
  shippingFormGroup: FormGroup;

  order_sortings: Array<any> = [
    { title: 'By creation date', value: 'date-created' },
    { title: 'By update date',   value: 'date-update'  },
    { title: 'By status',        value: 'status'       },
    { title: 'By item name',     value: 'item-name'    },
    { title: 'By category',      value: 'category'     },
    { title: 'By quantity',      value: 'quantity'     },
    { title: 'By price',         value: 'price'        }
  ];

  // TODO: disable radios for 0 amount-statuses
  order_filtering: Array<any> = [
    { title: 'All orders', value: 'all',     amount: '3' },
    { title: 'Bidding',    value: 'bidding', amount: '1' },
    { title: 'In escrow',  value: 'escrow',  amount: '0' },
    { title: 'Shipped',    value: 'shipped', amount: '1' },
    { title: 'Sold',       value: 'sold',    amount: '1' }
  ];

  // Orders
  orders: Array<any> = [
    {
      name: 'NFC-enabled contactless payment perfume',
      hash: 'AGR', // TODO: randomized string (maybe first letters of TX ID) for quick order ID
      hash_bg: 'bg6', // TODO: assign random hash_bg (bg1-bg16)
      status: 'bidding',
      status_info: 'Buyer wants to purchase this item – Approve or reject this order to continue',
      action_icon: 'part-check',
      action_button: 'Accept bid',
      action_tooltip: 'Approve this order and sell to this buyer',
      action_disabled: false
    },
    {
      name: 'My basic listing template',
      hash: '5EH', // TODO: randomized string (maybe first letters of TX ID) for quick order ID
      hash_bg: 'bg2', // TODO: assign random hash_bg (bg1-bg16)
      status: 'escrow',
      status_info: 'Buyer\'s funds are locked in escrow, order is ready to ship – when sent, mark order as shipped and await its delivery',
      action_icon: 'part-check',
      action_button: 'Mark as shipped',
      action_tooltip: 'Confirm that the order has been shipped to buyer',
      action_disabled: false
    },
    {
      name: 'Fresh product (2 kg)',
      hash: 'SPP', // TODO: randomized string (maybe first letters of TX ID) for quick order ID
      hash_bg: 'bg11', // TODO: assign random hash_bg (bg1-bg16)
      status: 'shipping',
      status_info: 'Order sent to buyer, waiting for buyer to confirm the delivery',
      action_icon: 'part-date',
      action_button: 'Waiting for delivery',
      action_tooltip: 'Awaiting confirmation of successfull delivery by Buyer',
      action_disabled: true
    },
    {
      name: 'Fresh product (2 kg)',
      hash: '1ER', // TODO: randomized string (maybe first letters of TX ID) for quick order ID
      hash_bg: 'bg8', // TODO: assign random hash_bg (bg1-bg16)
      status: 'sold',
      status_info: 'Order delivery confirmed by buyer – awaiting Buyer\'s feedback',
      action_icon: 'part-date',
      action_button: 'Waiting for feedback',
      action_tooltip: 'Awaiting buyer\'s feedback on the order',
      action_disabled: true
    },
  ];

  filters: any = {
    search: undefined,
    sort:   undefined,
    status: undefined
  };

  profile: any = { };

  /* cart */
  cart: any[] = [];

  /* favs */
  favorites: any[] = [];

  constructor(
    private _formBuilder: FormBuilder,
    private _router: Router,
    private _profileService: ProfileService,
    private listingService: ListingService,
    private cartService: CartService,
    private favoritesService: FavoritesService
  ) { }

  ngOnInit() {

    this._profileService.get(1).take(1).subscribe(profile => {
      console.log("GOT PROFILE");
      console.log(profile);
      this.profile = profile;
    });

    this.cartFormGroup = this._formBuilder.group({
      firstCtrl: ['']
    });

    this.shippingFormGroup = this._formBuilder.group({
      title:        [''],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city:         ['', Validators.required],
      state:        [''],
      countryCode:  ['', Validators.required],
      zipCode:      ['', Validators.required],
      save:         ['']
    });

    this.getCart();

    this.favoritesService.getFavorites().take(1).subscribe(favorites => {
      favorites.map(favorite => {
        this.listingService.get(favorite.id).take(1).subscribe(listing => {
          this.favorites.push(listing);
        });
      });
    })
  }

  clear(): void {
    this.filters();
  }

  changeTab(index: number): void {
    this.selectedTab = index;
  }

  /* cart */

  goToListings() {
    this._router.navigate(['/market/overview']);
  }

  getImage(listing) {
    return listing.ItemInformation.ItemImages[0].ItemImageDatas.find(size => {
      return size.imageVersion === 'THUMBNAIL';
    }).data;
  }

  getPrice(listing) {
    let price: number = listing.PaymentInformation.ItemPrice.basePrice;
    return {
      int:     price.toFixed(0),
      cents:  +(price % 1).toFixed(8) * 100000000,
      escrow:  (price * listing.PaymentInformation.Escrow.Ratio.buyer / 100).toFixed(8)
    };
  }

  getShipping(listing) {
    let price: number = listing.PaymentInformation.ItemPrice.ShippingPrice;
    return {
      int:     price.toFixed(0),
      cents: +(price % 1).toFixed(8) * 100000000
    };
  }

  getSubTotal() {
    let total = 0.0;
    this.cart.map(item => total += item.PaymentInformation.ItemPrice.basePrice);
    return total;
  }

  removeFromCart(id) {
    this.cartService.removeItem(id).take(1).subscribe(res => {
      console.log(res);
      this.getCart();
    });
  }

  getCart() {
    this.cart = [];
    this.cartService.getCart().take(1).subscribe(cart => {
      cart.ShoppingCartItems.map(item => {
        this.listingService.get(item.id).take(1).subscribe(listing => {
          console.log(listing);
          this.cart.push(listing);
        });
      });
    });
  }

  /* shipping */

  updateShippingProfile() {
    if (this.shippingFormGroup.value.save) {
      delete this.shippingFormGroup.value.save;
      this._profileService.addShippingAddress(this.shippingFormGroup.value).take(1)
        .subscribe(address => {
          this._profileService.get(1).take(1)
            .subscribe(updatedProfile => this.profile = updatedProfile);
        });
    }
  }

  fillAddress(address) {
    console.log(address);
    address.countryCode = address.country;
    delete address.country;
    address.save = false;
    delete address.id;
    delete address.profileId;
    delete address.updatedAt;
    delete address.createdAt;
    this.shippingFormGroup.setValue(address);
  }

}