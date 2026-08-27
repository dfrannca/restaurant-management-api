'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Category, Order, PaymentMethod, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/context/UserContext';
import { ArrowLeft, CheckCircle2, Minus, Plus, Search, Trash2, X, Clock, Printer } from 'lucide-react';

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const paymentName = (v: PaymentMethod | null) => ({ 0: 'Dinheiro', 1: 'Pix', 2: 'Cartão de débito', 3: 'Cartão de crédito' }[v ?? 0]);
const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function OrderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const { currentUser } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [receivedText, setReceivedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingItems, setChangingItems] = useState(false);
  const [paid, setPaid] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);

  const load = useCallback(async () => {
    console.time('[tables/order] load');
    try {
      const [o, p, c, r] = await Promise.all([
        api.getActiveOrderByTable(Number(tableId)),
        api.getActiveProducts(),
        api.getCategories(),
        api.getOpenCashRegister().catch(() => null)
      ]);
      setOrder(o);
      setProducts(p);
      setCategories(c);
      setBlocked(!r);
      setNotes(Object.fromEntries(o.orderItems.map(i => [i.id, i.observations ?? ''])));
      console.timeEnd('[tables/order] load');
      console.info('[tables/order] API response', { tableId, orderId: o.id, items: o.orderItems.length });
    } catch {
      console.timeEnd('[tables/order] load');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router, tableId]);

  useEffect(() => {
    console.info('[tables/order] render', { tableId, itemCount: order?.orderItems.length ?? 0, total: order?.totalAmount ?? 0 });
  }, [order, tableId]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const list = useMemo(
    () => products.filter(p => (!category || p.categoryId === category) && (!search || norm(p.name).includes(norm(search)))),
    [products, category, search]
  );

  const orderTotal = useMemo(
    () => order?.orderItems.reduce((sum, item) => sum + item.subtotal, 0) ?? 0,
    [order?.orderItems]
  );

  async function addProduct(product: Product) {
    if (!order || changingItems || blocked) return;
    setChangingItems(true);
    console.time(`[order-item] add ${product.id}`);
    try {
      const updatedOrder = await api.addOrderItem(order.id, { productId: product.id, quantity: 1 });
      setOrder(updatedOrder);
      setNotes(Object.fromEntries(updatedOrder.orderItems.map(i => [i.id, i.observations ?? ''])));
      console.timeEnd(`[order-item] add ${product.id}`);
      console.info('[order-item] updated', { orderId: updatedOrder.id, items: updatedOrder.orderItems.length, total: updatedOrder.totalAmount });
    } catch (error) {
      console.error('[order-item] add failed', error);
      alert((error as Error).message || 'Falha ao adicionar produto.');
    } finally {
      setChangingItems(false);
    }
  }

  async function update(id: number, quantity: number, observation = notes[id] || '') {
    if (!order || quantity < 1) return;
    if (changingItems) return;
    setChangingItems(true);
    try {
      const updatedOrder = await api.updateOrderItem(order.id, id, { quantity, observations: observation || undefined });
      setOrder(updatedOrder);
    } catch (error) {
      alert((error as Error).message || 'Falha ao atualizar item.');
    } finally {
      setChangingItems(false);
    }
  }

  async function remove(id: number) {
    if (order) {
      if (changingItems) return;
      setChangingItems(true);
      try {
        const updatedOrder = await api.removeOrderItem(order.id, id);
        setOrder(updatedOrder);
      } catch (error) {
        alert((error as Error).message || 'Falha ao remover item.');
      } finally {
        setChangingItems(false);
      }
    }
  }

  function printCommand() {
    const currentOrder = order;
    if (!currentOrder || !currentOrder.orderItems.length) {
      alert('Não é possível gerar uma comanda vazia.');
      return;
    }
    console.info('[command] print requested', { orderId: currentOrder.id, user: currentUser?.name ?? 'Não informado' });
    setPrintRequested(true);
  }

  useEffect(() => {
    if (!printRequested || !order?.orderItems.length) return;

    const restoreAfterPrint = () => {
      setPrintRequested(false);
      console.info('[command] print closed', { orderId: order.id });
    };
    const frame = window.requestAnimationFrame(() => window.print());
    window.addEventListener('afterprint', restoreAfterPrint);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, [order, printRequested]);

  const received = Number(receivedText.replace(',', '.'));
  const insufficient = method === PaymentMethod.Cash && (!receivedText || Number.isNaN(received) || !order || received < orderTotal);
  const change = Number.isNaN(received) || !order ? 0 : Math.max(0, received - orderTotal);

  async function pay() {
    if (!order || !currentUser || method === null || insufficient || saving) return;
    setSaving(true);
    try {
      await api.closeOrder(order.id, { paymentMethod: method, userId: currentUser.id });
      setPaid(true);
      window.dispatchEvent(new Event('cashRegisterChanged'));
    } catch (e) {
      alert((e as Error).message || 'Falha ao confirmar pagamento.');
    } finally {
      setSaving(false);
    }
  }

  const getOrderStatus = (openedAt: string | undefined, isClosed: boolean) => {
    if (isClosed) return 'Pedido encerrado';
    if (!openedAt) return 'Aberta recentemente';

    const date = new Date(openedAt);
    if (Number.isNaN(date.getTime())) return 'Aberta recentemente';

    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours === 1) return 'Aberta há 1 hora';
    if (hours > 1) return `Aberta há ${hours} horas`;
    if (minutes === 1) return 'Aberta há 1 minuto';
    if (minutes > 1) return `Aberta há ${minutes} minutos`;
    return 'Aberta recentemente';
  };

  if (loading || !order)
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );


  return (
    <div className="min-h-screen bg-graphite pb-24">
      <header className="border-b border-white/8 bg-graphite/85">
        <div className="container mx-auto flex flex-col justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6">
          <div className="flex flex-col items-start gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="min-h-10 border-surface-light bg-surface-light/30 px-3 text-slate-200 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
            <div className="flex flex-col items-start gap-0.5">
              <p className="label-uppercase text-amber-400">Pedido em andamento</p>
              <h1 className="font-heading text-3xl font-extrabold leading-tight text-white">Mesa {order.tableNumber}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{getOrderStatus(order.openedAt, order.isClosed)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-right">
            <span className="label-uppercase text-amber-300">Total do pedido</span>
            <p className="font-heading text-3xl font-extrabold text-amber-300">{money(orderTotal)}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-2 sm:px-6">
        <Card className="glass-panel min-h-[36rem] rounded-2xl border-0">
          <CardHeader className="border-b border-white/8">
            <CardTitle className="font-heading text-lg text-white">Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[30rem] flex-col p-4">
            {!order.orderItems.length ? (
              <div className="m-auto text-center text-slate-400">
                Nenhum item adicionado
                <br />
                <span className="text-sm text-slate-500">Escolha um produto ao lado para começar.</span>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {order.orderItems.map(i => (
                  <div key={i.id} className="rounded-xl border border-white/8 bg-surface-light/20 p-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{i.productName}</p>
                        <p className="text-xs text-slate-400">{money(i.unitPrice)} por unidade</p>
                      </div>
                      <b className="text-amber-300">{money(i.subtotal)}</b>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="icon-sm" variant="outline" disabled={blocked || i.quantity === 1} onClick={() => update(i.id, i.quantity - 1)}>
                        <Minus />
                      </Button>
                      <b className="w-7 text-center text-white">{i.quantity}</b>
                      <Button size="icon-sm" variant="outline" disabled={blocked} onClick={() => update(i.id, i.quantity + 1)}>
                        <Plus />
                      </Button>
                      {!blocked && (
                        <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="ml-auto text-red-300">
                          <Trash2 /> Remover
                        </Button>
                      )}
                    </div>
                    <Input
                      disabled={blocked}
                      value={notes[i.id] || ''}
                      onChange={e => setNotes(n => ({ ...n, [i.id]: e.target.value }))}
                      onBlur={() => update(i.id, i.quantity)}
                      placeholder="Observação opcional"
                      className="mt-3 border-surface-light bg-graphite/30 text-sm text-white"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-white/8 pt-3">
              <span className="label-uppercase">Total</span>
              <b className="font-heading text-2xl text-amber-300">{money(orderTotal)}</b>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel min-h-[36rem] rounded-2xl border-0">
          <CardHeader className="border-b border-white/8">
            <CardTitle className="font-heading text-lg text-white">Resumo do pedido</CardTitle>
          </CardHeader>
          <CardContent className="relative flex h-[30rem] flex-col p-4">
            {blocked ? (
              <p className="m-auto text-slate-400">Abra o caixa para adicionar produtos.</p>
            ) : (
              <>
                <p className="label-uppercase mb-2 text-amber-300">Adicionar produto</p>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar produto..."
                    className="border-surface-light bg-graphite/30 pl-9 pr-9 text-white"
                  />
                  {search && (
                    <Button size="icon-sm" variant="ghost" onClick={() => setSearch('')} className="absolute right-1 top-1">
                      <X />
                    </Button>
                  )}
                </div>

                <Select value={category?.toString() || ''} onValueChange={v => setCategory(v ? Number(v) : null)}>
                  <SelectTrigger className="mt-3 border-surface-light bg-surface-light/30 text-white">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as categorias</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative mt-3 flex-1 overflow-hidden">
                  <div className="absolute inset-0 grid content-start grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {list.length ? (
                      list.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={changingItems}
                          onClick={() => void addProduct(p)}
                          className="rounded-xl border border-white/8 bg-surface-light/20 p-3 text-left transition-all hover:border-amber-400/60 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <b className="text-sm text-white">{p.name}</b>
                          <p className="mt-2 font-bold text-amber-300">{money(p.price)}</p>
                          <small className="text-emerald-400">DISPONÍVEL</small>
                        </button>
                      ))
                    ) : (
                      <p className="col-span-full m-auto mt-10 text-center text-sm text-slate-400">Nenhum produto encontrado</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {!blocked && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-graphite/95 p-3">
          <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="label-uppercase">Total a pagar</span>
              <p className="font-heading text-xl font-bold text-amber-300">{money(orderTotal)}</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={!order.orderItems.length} onClick={printCommand} variant="outline" className="border-amber-400 text-amber-300 hover:bg-amber-400/10">
                <Printer /> Gerar Comanda
              </Button>
              <Button disabled={!order.orderItems.length} onClick={() => { setPaid(false); setPaymentOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500">
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {typeof document !== 'undefined' && createPortal(<section className="print-command" aria-hidden="true">
        <h1>BAR &amp; CHURRASCARIA</h1>
        <h2>PROGRESSO</h2>
        <hr />
        <p>MESA: {String(order.tableNumber).padStart(2, '0')}</p>
        <p>COMANDA: #{String(order.id).padStart(6, '0')}</p>
        <p>ABERTA: {new Date(order.openedAt).toLocaleString('pt-BR')}</p>
        <h3>ITENS</h3>
        <hr />
        {order.orderItems.map(item => (
          <div className="print-command-item" key={item.id}>
            <span>{String(item.quantity).padStart(2, '0')}x {item.productName}</span>
            <strong>{money(item.subtotal)}</strong>
          </div>
        ))}
        <hr />
        <div className="print-command-item print-command-total"><span>TOTAL</span><strong>{money(orderTotal)}</strong></div>
        <p>GARÇOM: {currentUser?.name || order.userName || 'Não informado'}</p>
        <hr />
        <h2>COMANDA ABERTA</h2>
      </section>, document.body)}

      <Dialog 
        open={paymentOpen} 
        onOpenChange={v => {
          setPaymentOpen(v);
          if (!v && paid) {
            router.push('/');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-surface-light bg-surface text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {paid ? 'Pagamento realizado com sucesso' : 'Finalizar pagamento'}
            </DialogTitle>
          </DialogHeader>

          {paid ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
              <p>Mesa {order.tableNumber} liberada e operação registrada no histórico.</p>
              <p>
                Forma de pagamento: <b>{paymentName(method)}</b>
              </p>
              {method === 0 && (
                <p>
                  Recebido: <b>{money(received)}</b> · Troco: <b className="text-emerald-400">{money(change)}</b>
                </p>
              )}
              <div className="mt-6 flex justify-center gap-3">
                <Button 
                  onClick={() => {
                    setPaymentOpen(false);
                    router.push('/');
                  }} 
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Fechar
                </Button>
                <Button variant="outline" onClick={printCommand}>
                  Imprimir Comanda
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-graphite/30 p-3">
                <p className="label-uppercase">
                  Mesa {order.tableNumber}
                  {order.customerName ? ` · ${order.customerName}` : ''}
                </p>
                {order.orderItems.map(i => (
                  <p key={i.id} className="mt-1 text-sm text-slate-300">
                    {i.quantity}× {i.productName}
                    <span className="float-right">{money(i.subtotal)}</span>
                  </p>
                ))}
                <p className="mt-3 text-right font-heading text-2xl text-amber-300">{money(orderTotal)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map(v => (
                  <Button
                    key={v}
                    variant="outline"
                    onClick={() => { setMethod(v as PaymentMethod); setReceivedText(''); }}
                    className={method === v ? 'border-amber-400 bg-amber-400/10' : ''}
                  >
                    {paymentName(v as PaymentMethod)}
                  </Button>
                ))}
              </div>

              {method === 0 && (
                <div>
                  <Label>Valor recebido</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receivedText}
                    onChange={e => setReceivedText(e.target.value)}
                    placeholder="0,00"
                    className="mt-2"
                  />
                  {receivedText && (
                    <>
                      {insufficient ? (
                        <p className="mt-2 text-sm text-red-400">Valor insuficiente</p>
                      ) : change === 0 ? (
                        <p className="mt-2 text-sm text-slate-300">Pagamento exato — não há troco</p>
                      ) : (
                        <p className="mt-2 text-sm text-emerald-400">
                          Troco a devolver: <b>{money(change)}</b>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentOpen(false)}
                  className="flex-1"
                >
                  Voltar e editar pedido
                </Button>
                <Button
                  onClick={pay}
                  disabled={method === null || insufficient || saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  {saving ? 'Processando...' : 'Confirmar pagamento'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
