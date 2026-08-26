'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { CheckCircle2, Minus, Plus, Search, Trash2, X, Clock } from 'lucide-react';

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
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [receivedText, setReceivedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [paid, setPaid] = useState(false);

  async function load() {
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
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [tableId]);

  const list = useMemo(
    () => products.filter(p => (!category || p.categoryId === category) && (!search || norm(p.name).includes(norm(search)))),
    [products, category, search]
  );

  async function add() {
    if (!order || !selected) return;
    await api.addOrderItem(order.id, { productId: selected.id, quantity: qty, observations: note || undefined });
    setSelected(null);
    setQty(1);
    setNote('');
    await load();
  }

  async function update(id: number, quantity: number, observation = notes[id] || '') {
    if (!order || quantity < 1) return;
    await api.updateOrderItem(order.id, id, { quantity, observations: observation || undefined });
    await load();
  }

  async function remove(id: number) {
    if (order) {
      await api.removeOrderItem(order.id, id);
      await load();
    }
  }

  const received = Number(receivedText.replace(',', '.'));
  const insufficient = method === PaymentMethod.Cash && (!receivedText || Number.isNaN(received) || !order || received < order.totalAmount);
  const change = Number.isNaN(received) || !order ? 0 : Math.max(0, received - order.totalAmount);

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

  // Format time without negative values - handle UTC conversion
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Handle UTC to local conversion
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const diff = now.getTime() - localDate.getTime();
    
    // If date is in the future, show as just opened
    if (diff < 0)return 'Recém aberta';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}min`;
    }
    return `${minutes}min`;
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
          <div>
            <Button variant="ghost" onClick={() => router.push('/')} className="-ml-3 text-slate-400">
              ← Voltar
            </Button>
            <p className="label-uppercase text-amber-400">Pedido em andamento</p>
            <h1 className="font-heading text-3xl font-extrabold text-white">Mesa {order.tableNumber}</h1>
            <p className="text-sm text-slate-400">{order.customerName || 'Cliente não informado'}</p>
            {order.openedAt && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Aberta há {formatTime(order.openedAt)}</span>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-right">
            <span className="label-uppercase text-amber-300">Total do pedido</span>
            <p className="font-heading text-3xl font-extrabold text-amber-300">{money(order.totalAmount)}</p>
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
              <b className="font-heading text-2xl text-amber-300">{money(order.totalAmount)}</b>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel min-h-[36rem] rounded-2xl border-0">
          <CardHeader className="border-b border-white/8">
            <CardTitle className="font-heading text-lg text-white">Adicionar produto</CardTitle>
          </CardHeader>
          <CardContent className="relative flex h-[30rem] flex-col p-4">
            {blocked ? (
              <p className="m-auto text-slate-400">Abra o caixa para adicionar produtos.</p>
            ) : (
              <>
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
                          onClick={() => setSelected(p)}
                          className={`rounded-xl border p-3 text-left transition-all ${
                            selected?.id === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/8 bg-surface-light/20 hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <b className="text-sm text-white">{p.name}</b>
                            {selected?.id === p.id && <CheckCircle2 className="h-4 w-4 text-amber-300" />}
                          </div>
                          <p className="mt-2 font-bold text-amber-300">{money(p.price)}</p>
                          <small className="text-emerald-400">DISPONÍVEL</small>
                        </button>
                      ))
                    ) : (
                      <p className="col-span-full m-auto mt-10 text-center text-sm text-slate-400">Nenhum produto encontrado</p>
                    )}
                  </div>

                  {selected && (
                    <>
                      <div className="absolute inset-0 z-40 bg-graphite/80 backdrop-blur-sm transition-opacity" onClick={() => setSelected(null)} />
                      <div className="absolute inset-0 z-50 flex flex-col justify-between rounded-xl border border-amber-400/20 bg-graphite p-4 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-lg font-semibold text-white">{selected.name}</p>
                            <p className="text-lg text-amber-300">{money(selected.price)}</p>
                          </div>
                          <Button size="icon-sm" variant="ghost" onClick={() => setSelected(null)} className="text-slate-400">
                            <X />
                          </Button>
                        </div>

                        <div className="mt-4 flex-1 space-y-4">
                          <div>
                            <Label className="text-xs text-slate-400">Quantidade</Label>
                            <div className="mt-1 flex items-center gap-3">
                              <Button size="icon" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10">
                                <Minus />
                              </Button>
                              <b className="w-10 text-center text-xl text-white">{qty}</b>
                              <Button size="icon" variant="outline" onClick={() => setQty(qty + 1)} className="h-10 w-10">
                                <Plus />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-slate-400">Observação (opcional)</Label>
                            <Input
                              value={note}
                              onChange={e => setNote(e.target.value)}
                              placeholder="Ex: Sem cebola, ponto da carne..."
                              className="mt-1 border-surface-light bg-graphite/30 text-white"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex gap-3 border-t border-white/10 pt-4">
                          <Button variant="outline" onClick={() => setSelected(null)} className="flex-1 py-6">
                            Cancelar
                          </Button>
                          <Button onClick={add} className="flex-1 bg-emerald-600 py-6 font-bold text-white hover:bg-emerald-500">
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {!blocked && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-graphite/95 p-3">
          <div className="container mx-auto flex justify-between">
            <div>
              <span className="label-uppercase">Total a pagar</span>
              <p className="font-heading text-xl font-bold text-amber-300">{money(order.totalAmount)}</p>
            </div>
            <Button disabled={!order.orderItems.length} onClick={() => { setPaid(false); setPaymentOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500">
              Fechar pedido
            </Button>
          </div>
        </div>
      )}

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
                <Button variant="outline" onClick={() => window.print()}>
                  Imprimir comprovante
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
                <p className="mt-3 text-right font-heading text-2xl text-amber-300">{money(order.totalAmount)}</p>
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
