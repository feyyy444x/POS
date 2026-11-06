create index if not exists self_service_order_items_product_id_idx on public.self_service_order_items(product_id);
create index if not exists self_service_orders_pos_order_id_idx on public.self_service_orders(pos_order_id);
create index if not exists self_service_orders_queue_ticket_id_idx on public.self_service_orders(queue_ticket_id);
create index if not exists self_service_orders_verified_by_idx on public.self_service_orders(verified_by);
