'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Category, Order, OrderItem, PaymentMethod, Product, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/context/UserContext';
import { ArrowLeft, CheckCircle2, Minus, Plus, Search, Trash2, X, Clock, Printer, PlusCircle, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

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
  const [syncState, setSyncState] = useState<'saving' | 'synced' | 'error'>('synced');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [paid, setPaid] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      setSyncState('synced');
      setSyncMessage(null);
      console.timeEnd('[tables/order] load');
      console.info('[tables/order] API response', { tableId, orderId: o.id, items: o.orderItems.length });
    } catch {
      console.timeEnd('[tables/order] load');
      setSyncState('error');
      setSyncMessage('Erro ao sincronizar — Tentar novamente');
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

  const syncAction = useCallback((nextState: 'saving' | 'synced' | 'error', message?: string) => {
    setSyncState(nextState);
    setSyncMessage(nextState === 'error' ? message ?? 'Erro ao sincronizar — Tentar novamente' : null);
  }, []);

  const retrySync = useCallback(() => {
    syncAction('saving');
    void load();
  }, [load, syncAction]);

  async function addProduct(product: Product, quantity = 1) {
    if (!order || changingItems || blocked) return;
    setChangingItems(true);
    syncAction('saving');
    console.time(`[order-item] add ${product.id}`);

    // Optimistic update: adiciona o item imediatamente na lista antes do roundtrip.
    // O id temporário (negativo) é substituído pelos dados reais quando a API responder.
    const optimisticId = -Date.now();
    const optimisticItem: OrderItem = {
      id: optimisticId,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    };

    setOrder(prev => prev ? { ...prev, orderItems: [...prev.orderItems, optimisticItem] } : prev);
    setNotes(prev => ({ ...prev, [optimisticId]: '' }));

    try {
      const updatedOrder = await api.addOrderItem(order.id, { productId: product.id, quantity });
      setOrder(updatedOrder);
      setNotes(Object.fromEntries(updatedOrder.orderItems.map(i => [i.id, i.observations ?? ''])));
      syncAction('synced');
      console.timeEnd(`[order-item] add ${product.id}`);
      console.info('[order-item] updated', { orderId: updatedOrder.id, items: updatedOrder.orderItems.length, total: updatedOrder.totalAmount });
    } catch (error) {
      // Rollback: remove o item otimista já que a API falhou
      setOrder(prev => prev ? { ...prev, orderItems: prev.orderItems.filter(i => i.id !== optimisticId) } : prev);
      setNotes(prev => {
        const next = { ...prev };
        delete next[optimisticId];
        return next;
      });
      console.error('[order-item] add failed', error);
      syncAction('error', (error as Error).message || 'Erro ao sincronizar — Tentar novamente');
      alert((error as Error).message || 'Falha ao adicionar produto.');
    } finally {
      setChangingItems(false);
    }
  }

  async function addSelectedProduct() {
    if (!selectedProduct) return;
    const product = selectedProduct;
    const quantity = selectedQuantity;
    // Fecha o seletor de produtos imediatamente, antes de persistir.
    // O optimistic update já insere o item na lista logo em seguida, sem bloquear a UI.
    closeProductSelector();
    await addProduct(product, quantity);
  }

  async function update(id: number, quantity: number, observation = notes[id] || '') {
    if (!order || quantity < 1) return;
    if (changingItems) return;
    setChangingItems(true);
    syncAction('saving');
    try {
      const updatedOrder = await api.updateOrderItem(order.id, id, { quantity, observations: observation || undefined });
      setOrder(updatedOrder);
      syncAction('synced');
    } catch (error) {
      syncAction('error', (error as Error).message || 'Erro ao sincronizar — Tentar novamente');
      alert((error as Error).message || 'Falha ao atualizar item.');
    } finally {
      setChangingItems(false);
    }
  }

  async function remove(id: number) {
    if (order) {
      if (changingItems) return;
      setChangingItems(true);
      syncAction('saving');
      try {
        const updatedOrder = await api.removeOrderItem(order.id, id);
        setOrder(updatedOrder);
        syncAction('synced');
      } catch (error) {
        syncAction('error', (error as Error).message || 'Erro ao sincronizar — Tentar novamente');
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

  async function updateOrderStatus(newStatus: OrderStatus) {
    if (!order || updatingStatus) return;
    setUpdatingStatus(true);
    syncAction('saving');
    try {
      const updatedOrder = await api.updateOrderStatus(order.id, newStatus);
      setOrder(updatedOrder);
      setStatusModalOpen(false);
      syncAction('synced');
      console.info('[order] status updated', { orderId: updatedOrder.id, status: updatedOrder.status });
    } catch (error) {
      console.error('[order] status update failed', error);
      syncAction('error', (error as Error).message || 'Erro ao sincronizar — Tentar novamente');
      alert((error as Error).message || 'Falha ao atualizar status.');
    } finally {
      setUpdatingStatus(false);
    }
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

  const openProductSelector = () => {
    setProductModalOpen(true);
    setSearch('');
    setCategory(null);
    setSelectedProductId(null);
    setSelectedQuantity(1);
  };

  const closeProductSelector = () => {
    setProductModalOpen(false);
    setSearch('');
    setCategory(null);
    setSelectedProductId(null);
    setSelectedQuantity(1);
  };

  const selectedProduct = selectedProductId !== null ? products.find(product => product.id === selectedProductId) ?? null : null;

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

  const getStatusText = (status: OrderStatus) => {
    // Status ausente/legado (ex.: resposta de API antiga sem o campo) é tratado como "em andamento"
    return status === OrderStatus.OnTable ? 'PEDIDO NA MESA' : 'PEDIDO EM ANDAMENTO';
  };

  const getStatusColor = (status: OrderStatus) => {
    return status === OrderStatus.OnTable
      ? 'bg-emerald-500/40 border-emerald-400 text-emerald-50 font-bold'
      : 'bg-amber-500/40 border-amber-400 text-amber-50 font-bold';
  };

  const syncLabel = syncState === 'saving'
    ? 'Salvando alterações...'
    : syncState === 'error'
      ? 'Erro ao sincronizar — Tentar novamente'
      : 'Pedido sincronizado';
  const syncIconClass = syncState === 'saving'
    ? 'animate-spin text-emerald-300'
    : syncState === 'error'
      ? 'text-red-300'
      : 'text-emerald-300';

  if (loading || !order)
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );


  return (
    <div className="min-h-screen bg-graphite pb-10">
      <div className="mx-auto w-[92vw] max-w-[1500px] py-6">
        <header className="mb-5">
          <div className="flex flex-col gap-2 px-0 py-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="min-h-10 border-surface-light bg-surface-light/30 px-3 text-slate-200 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>

              <div className="flex flex-col items-start gap-1">
                <span className="font-heading text-2xl font-extrabold leading-tight text-white sm:text-3xl">Mesa {order.tableNumber}</span>
                <div className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{getOrderStatus(order.openedAt, order.isClosed)}</span>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    {syncState === 'error' ? (
                      <AlertCircle className="h-3.5 w-3.5 text-red-300" />
                    ) : (
                      <RefreshCw className={`h-3.5 w-3.5 ${syncIconClass}`} />
                    )}
                    <span className={syncState === 'error' ? 'text-red-300' : 'text-emerald-300'}>
                      {syncState === 'error' ? 'Erro ao sincronizar' : 'Sincronizado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setStatusModalOpen(true)}
              className={`w-fit label-uppercase border px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${getStatusColor(order.status)}`}
            >
              {getStatusText(order.status)}
            </Button>
          </div>
        </header>

        <main className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
          <Card className="glass-panel rounded-2xl border-0">
            <CardHeader className="border-b border-white/8 pb-2">
              <CardTitle className="font-heading text-lg text-white">Itens do pedido</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-3">
              {!order.orderItems.length ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-light bg-surface-light/10 px-6 py-8 text-center text-slate-400">
                  <p className="text-lg font-medium text-slate-200">Nenhum item adicionado</p>
                  <p className="mt-2 text-sm text-slate-400">Clique em “Adicionar Produto” para começar.</p>
                  <Button
                    variant="outline"
                  onClick={openProductSelector}
                    className="mt-4 border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {order.orderItems.map(i => (
                    <div key={i.id} className="rounded-xl border border-white/8 bg-surface-light/15 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-white">{i.productName}</p>
                          <p className="mt-1 text-xs text-slate-400">{money(i.unitPrice)} por unidade</p>
                        </div>
                        <span className="font-heading text-base text-amber-300">{money(i.subtotal)}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button size="icon-sm" variant="outline" disabled={blocked || i.quantity === 1} onClick={() => update(i.id, i.quantity - 1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="min-w-7 text-center text-sm font-semibold text-white">{i.quantity}</span>
                        <Button size="icon-sm" variant="outline" disabled={blocked} onClick={() => update(i.id, i.quantity + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        {!blocked && (
                          <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="ml-auto text-red-300 hover:text-red-200 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </Button>
                        )}
                      </div>

                      <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Observação do item</label>
                        <textarea
                          disabled={blocked}
                          value={notes[i.id] || ''}
                          onChange={e => setNotes(n => ({ ...n, [i.id]: e.target.value }))}
                          onBlur={() => update(i.id, i.quantity)}
                          placeholder="Ex.: sem cebola, pouco sal, bem passado..."
                          className="w-full min-h-[60px] resize-none rounded-lg border border-surface-light bg-graphite/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <Card className="glass-panel rounded-2xl border-0 h-fit">
              <CardHeader className="border-b border-white/8 pb-2">
                <CardTitle className="font-heading text-base text-white">Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="px-2 py-1.5">
                {blocked ? (
                  <div className="rounded-lg border border-dashed border-surface-light bg-surface-light/10 px-3 py-2 text-center text-xs text-slate-400">
                    Abra o caixa para adicionar produtos.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Subtotal</span>
                      <span>{money(orderTotal)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center justify-between text-sm font-semibold text-white">
                      <span>TOTAL</span>
                      <span className="font-heading text-lg text-amber-300">{money(orderTotal)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {!blocked && (
              <div className="flex flex-col items-center justify-center gap-2">
                <Button
                  onClick={openProductSelector}
                  variant="outline"
                  className="w-full border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Produto
                </Button>

                <Button
                  disabled={!order.orderItems.length}
                  onClick={printCommand}
                  variant="outline"
                  className="w-full border-sky-400/40 bg-sky-400/10 text-sky-200 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Comanda
                </Button>

                <Button
                  disabled={!order.orderItems.length}
                  onClick={() => { setPaid(false); setPaymentOpen(true); }}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar Pedido
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

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

      <Dialog open={productModalOpen} onOpenChange={open => { if (!open) closeProductSelector(); else setProductModalOpen(true); }}>
        <DialogContent className="max-w-2xl border-surface-light bg-surface text-white">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <DialogTitle className="font-heading text-2xl text-white">Adicionar Produto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="border-surface-light bg-graphite/30 pl-9 pr-9 text-white placeholder:text-slate-500"
              />
              {search && (
                <Button size="icon-sm" variant="ghost" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Select value={category?.toString() || ''} onValueChange={v => setCategory(v ? Number(v) : null)}>
              <SelectTrigger className="border-surface-light bg-surface-light/30 text-white">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {list.length ? (
                list.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedQuantity(1);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                      selectedProductId === product.id
                        ? 'border-amber-400/70 bg-amber-500/10'
                        : 'border-white/8 bg-surface-light/10 hover:border-amber-400/50 hover:bg-amber-500/5'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{product.description || 'Produto disponível'}</p>
                    </div>
                    <span className="font-heading text-base text-amber-300">{money(product.price)}</span>
                  </button>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">Nenhum produto encontrado</p>
              )}
            </div>

            {selectedProduct && (
              <div className="rounded-xl border border-white/8 bg-surface-light/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{selectedProduct.name}</p>
                    <p className="text-sm text-amber-300">{money(selectedProduct.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setSelectedQuantity(value => Math.max(1, value - 1))}
                      disabled={selectedQuantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="min-w-6 text-center text-sm font-semibold text-white">{selectedQuantity}</span>
                    <Button variant="outline" size="icon-sm" onClick={() => setSelectedQuantity(value => value + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => void addSelectedProduct()}
                  disabled={changingItems}
                >
                  Adicionar ao pedido
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-sm border-surface-light bg-surface text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">Mudar status do pedido</DialogTitle>
          </DialogHeader>

          {order && (
            <div className="space-y-3">
              <Button
                variant={order.status !== OrderStatus.OnTable ? 'default' : 'outline'}
                onClick={() => updateOrderStatus(OrderStatus.InProgress)}
                disabled={updatingStatus}
                className={order.status !== OrderStatus.OnTable ? 'w-full bg-amber-500 hover:bg-amber-600' : 'w-full'}
              >
                {updatingStatus ? 'Atualizando...' : 'Pedido em andamento'}
              </Button>

              <Button
                variant={order.status === OrderStatus.OnTable ? 'default' : 'outline'}
                onClick={() => updateOrderStatus(OrderStatus.OnTable)}
                disabled={updatingStatus}
                className={order.status === OrderStatus.OnTable ? 'w-full bg-emerald-600 hover:bg-emerald-500' : 'w-full'}
              >
                {updatingStatus ? 'Atualizando...' : 'Pedido na mesa'}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setStatusModalOpen(false)}
                disabled={updatingStatus}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
