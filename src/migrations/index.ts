import * as migration_20260527_060346 from './20260527_060346';
import * as migration_20260527_102422 from './20260527_102422';
import * as migration_20260529_120000_performance_indexes from './20260529_120000_performance_indexes';
import * as migration_20260609_120000_products_limited_edition from './20260609_120000_products_limited_edition';
import * as migration_20260609_140000_orders from './20260609_140000_orders';
import * as migration_20260609_150000_orders_shipping_payment from './20260609_150000_orders_shipping_payment';
import * as migration_20260623_120000_posts from './20260623_120000_posts';
import * as migration_20260626_120000_products_price_percentage from './20260626_120000_products_price_percentage';
import * as migration_20260627_120000_products_discount_percentage from './20260627_120000_products_discount_percentage';
import * as migration_20260629_120000_posts_author_text from './20260629_120000_posts_author_text';
import * as migration_20260701_120000_posts_view_count from './20260701_120000_posts_view_count';
import * as migration_20260702_120000_newsletter from './20260702_120000_newsletter';
import * as migration_20260703_120000_orders_payment_pickup from './20260703_120000_orders_payment_pickup';
import * as migration_20260708_105643 from './20260708_105643';

export const migrations = [
  {
    up: migration_20260527_060346.up,
    down: migration_20260527_060346.down,
    name: '20260527_060346',
  },
  {
    up: migration_20260527_102422.up,
    down: migration_20260527_102422.down,
    name: '20260527_102422',
  },
  {
    up: migration_20260529_120000_performance_indexes.up,
    down: migration_20260529_120000_performance_indexes.down,
    name: '20260529_120000_performance_indexes',
  },
  {
    up: migration_20260609_120000_products_limited_edition.up,
    down: migration_20260609_120000_products_limited_edition.down,
    name: '20260609_120000_products_limited_edition',
  },
  {
    up: migration_20260609_140000_orders.up,
    down: migration_20260609_140000_orders.down,
    name: '20260609_140000_orders',
  },
  {
    up: migration_20260609_150000_orders_shipping_payment.up,
    down: migration_20260609_150000_orders_shipping_payment.down,
    name: '20260609_150000_orders_shipping_payment',
  },
  {
    up: migration_20260623_120000_posts.up,
    down: migration_20260623_120000_posts.down,
    name: '20260623_120000_posts',
  },
  {
    up: migration_20260626_120000_products_price_percentage.up,
    down: migration_20260626_120000_products_price_percentage.down,
    name: '20260626_120000_products_price_percentage',
  },
  {
    up: migration_20260627_120000_products_discount_percentage.up,
    down: migration_20260627_120000_products_discount_percentage.down,
    name: '20260627_120000_products_discount_percentage',
  },
  {
    up: migration_20260629_120000_posts_author_text.up,
    down: migration_20260629_120000_posts_author_text.down,
    name: '20260629_120000_posts_author_text',
  },
  {
    up: migration_20260701_120000_posts_view_count.up,
    down: migration_20260701_120000_posts_view_count.down,
    name: '20260701_120000_posts_view_count',
  },
  {
    up: migration_20260702_120000_newsletter.up,
    down: migration_20260702_120000_newsletter.down,
    name: '20260702_120000_newsletter',
  },
  {
    up: migration_20260703_120000_orders_payment_pickup.up,
    down: migration_20260703_120000_orders_payment_pickup.down,
    name: '20260703_120000_orders_payment_pickup',
  },
  {
    up: migration_20260708_105643.up,
    down: migration_20260708_105643.down,
    name: '20260708_105643',
  },
];
