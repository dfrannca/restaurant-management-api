'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Table, TableStatus, CashRegister } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/UserContext';
import { AlertCircle, Armchair, CircleDollarSign, Clock3, Users } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, token, loadingUsers } = useUser();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [observations, setObservations] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Cash Register states
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [isCheckingRegister, setIsCheckingRegister] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [registerBannerBlocked, setRegisterBannerBlocked] = useState(false);
  const [openingTableId, setOpeningTableId] = useState<number | null>(null);

  const checkRegisterAndLoad = useCallback(async () => {
    try {
      setIsCheckingRegister(true);
      const register = await api.getOpenCashRegister();
      if (register) {
        setCashRegister(register);
        setShowRegisterModal(false);
        setRegisterBannerBlocked(false);
      } else {
        setCashRegister(null);
        // Only show modal if not explicitly blocked by user
        if (!registerBannerBlocked) {
          setShowRegisterModal(true);
        }
      }
    } catch {
      setCashRegister(null);
      // Only show modal if not explicitly blocked by user
      if (!registerBannerBlocked) {
        setShowRegisterModal(true);
      }
    } finally {
      setIsCheckingRegister(false);
    }
  }, [registerBannerBlocked]);

  const loadTables = useCallback(async () => {
    console.time('[tables] load');
    console.info('[tables] load started', { at: new Date().toISOString() });
    try {
      const data = await api.getTables();
      console.info('[tables] API response', { at: new Date().toISOString(), count: data.length });
      const sortedTables = [...data].sort((firstTable, secondTable) => firstTable.number - secondTable.number);
      setTables(sortedTables);
      console.info('[tables] state updated', { at: new Date().toISOString(), count: sortedTables.length });
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      console.timeEnd('[tables] load');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadingUsers || !token) {
      return;
    }

    const initialLoad = window.setTimeout(() => {
      void checkRegisterAndLoad();
      void loadTables();
    }, 0);
    window.addEventListener('cashRegisterChanged', checkRegisterAndLoad);
    return () => {
      clearTimeout(initialLoad);
      window.removeEventListener('cashRegisterChanged', checkRegisterAndLoad);
    };
  }, [checkRegisterAndLoad, loadTables, loadingUsers, token]);

  useEffect(() => {
    console.info('[tables] list rendered', {
      at: new Date().toISOString(),
      count: tables.length,
      actions: tables.map((table) => ({ id: table.id, status: table.status, manage: table.status !== TableStatus.Free }))
    });
  }, [tables]);

  const handleOpenTable = async (tableId: number) => {
    setOpeningTableId(tableId);
    setIsDialogOpen(false);

    try {
      console.time(`[table-opening] ${tableId}`);
      const openedTable = await api.openTable(tableId, { customerName, observations });
      console.timeEnd(`[table-opening] ${tableId}`);
      console.info('[table-opening] confirmed', { tableId });
      setCustomerName('');
      setObservations('');
      setTables((currentTables) => currentTables.map((table) => (
        table.id === openedTable.id ? openedTable : table
      )));
      setSelectedTable(openedTable);
      router.push(`/orders/${openedTable.id}`);
    } catch (error) {
      console.error('Failed to open table:', error);
      alert((error as Error).message || 'Falha ao abrir mesa');
    } finally {
      setOpeningTableId(null);
    }
  };

  const handleOpenRegister = async () => {
    if (!currentUser) {
      alert('Selecione um usuário no cabeçalho antes de abrir o caixa.');
      return;
    }
    try {
      const balanceValue = parseFloat(openingBalance) || 0;
      const newRegister = await api.openCashRegister({ openingBalance: balanceValue }, currentUser.id);
      setCashRegister(newRegister);
      setShowRegisterModal(false);
      setRegisterBannerBlocked(false);
      setOpeningBalance('');
      // Trigger update event
      window.dispatchEvent(new Event('cashRegisterChanged'));
      loadTables();
    } catch (error) {
      console.error('Failed to open cash register:', error);
      const errorMessage = (error as Error).message || 'Falha ao abrir caixa';
      
      // If error says register is already open, refresh the state and close modal
      if (errorMessage.includes('already open')) {
        await checkRegisterAndLoad();
        setShowRegisterModal(false);
        setRegisterBannerBlocked(false);
        alert('O caixa já está aberto. Continuando com o caixa existente.');
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleCancelRegister = () => {
    setShowRegisterModal(false);
    setRegisterBannerBlocked(true);
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.Free:
        return 'bg-emerald-500 text-white';
      case TableStatus.Occupied:
        return 'bg-red-500 text-white';
      case TableStatus.ClosingBill:
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  const getStatusBorderColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.Free:
        return 'border-l-4 border-l-emerald-500';
      case TableStatus.Occupied:
        return 'border-l-4 border-l-red-500';
      case TableStatus.ClosingBill:
        return 'border-l-4 border-l-amber-500';
      default:
        return 'border-l-4 border-l-slate-500';
    }
  };

  const getStatusText = (status: TableStatus) => {
    switch (status) {
      case TableStatus.Free:
        return 'Livre';
      case TableStatus.Occupied:
        return 'Ocupada';
      case TableStatus.ClosingBill:
        return 'Fechando Conta';
      default:
        return 'Desconhecido';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading || isCheckingRegister) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-graphite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-slate-400 label-uppercase">Carregando mesas...</p>
        </div>
      </div>
    );
  }

  const isBlocked = !cashRegister;
  const freeTables = tables.filter((table) => table.status === TableStatus.Free).length;
  const occupiedTables = tables.filter((table) => table.status === TableStatus.Occupied).length;
  const openTotal = tables.reduce((total, table) => total + (table.currentTotal ?? 0), 0);

  return (
    <div className="min-h-0 flex-1 bg-graphite flex flex-col">
      {/* Title & Register Banner */}
      <div className="container mx-auto px-6 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="label-uppercase text-amber-400">Operação do salão</p>
            <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-white">Dashboard de Mesas</h1>
            <p className="mt-1 text-slate-400">Acompanhe a operação e acesse os pedidos com agilidade.</p>
          </div>
          <div className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest ${cashRegister ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
            {cashRegister ? 'Caixa em operação' : 'Aguardando abertura de caixa'}
          </div>
        </div>
      </div>

      {registerBannerBlocked && (
        <div className="container mx-auto px-6 mt-2 mb-4">
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 shadow-md">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div>
              <h4 className="font-bold uppercase tracking-wider text-xs">Caixa Fechado</h4>
              <p className="text-sm mt-0.5">
                Não existe um caixa aberto para hoje. Você precisa{' '}
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="font-bold underline text-red-300 hover:text-white transition-colors cursor-pointer"
                >
                  abrir o caixa
                </button>{' '}
                para poder abrir mesas ou registrar pedidos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 flex-1">
        <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between"><span className="label-uppercase">Mesas livres</span><Armchair className="h-4 w-4 text-emerald-400" /></div>
            <p className="mt-2 font-heading text-2xl font-extrabold text-white">{freeTables}</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between"><span className="label-uppercase">Em atendimento</span><Users className="h-4 w-4 text-rose-400" /></div>
            <p className="mt-2 font-heading text-2xl font-extrabold text-white">{occupiedTables}</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between"><span className="label-uppercase">Mesas totais</span><Clock3 className="h-4 w-4 text-sky-400" /></div>
            <p className="mt-2 font-heading text-2xl font-extrabold text-white">{tables.length}</p>
          </div>
          <div className="glass-panel col-span-2 rounded-2xl p-4 lg:col-span-1">
            <div className="flex items-center justify-between"><span className="label-uppercase">Em consumo</span><CircleDollarSign className="h-4 w-4 text-amber-400" /></div>
            <p className="mt-2 font-heading text-2xl font-extrabold text-amber-300">{formatCurrency(openTotal)}</p>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`${getStatusBorderColor(table.status)} flex min-h-[320px] flex-col overflow-visible rounded-2xl border-y border-r border-white/7 bg-surface/90 shadow-xl shadow-black/15 ring-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
            >
              <CardHeader className="border-b border-surface-light/40 bg-surface-light/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-2xl font-extrabold tracking-tight text-white">
                    Mesa {table.number}
                  </CardTitle>
                  <Badge
                    className={`${getStatusColor(table.status)} rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest`}
                  >
                    {getStatusText(table.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-3">
                <div className="flex min-h-0 flex-1 flex-col space-y-2">
                  {table.status !== TableStatus.Free && (
                    <>
                      {table.customerName && (
                        <div className="rounded-xl border border-surface-light/50 bg-surface-light/40 px-3 py-2">
                          <span className="label-uppercase text-amber-400">Cliente</span>
                          <p className="mt-1 text-sm font-medium text-slate-100">{table.customerName}</p>
                        </div>
                      )}
                      {table.currentTotal !== undefined && table.currentTotal > 0 && (
                        <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-center">
                          <span className="label-uppercase text-accent">Total</span>
                          <p className="mt-1 text-xl font-extrabold text-accent">
                            {formatCurrency(table.currentTotal)}
                          </p>
                        </div>
                      )}
                      {table.openedAt && (
                        <div className="rounded-xl border border-surface-light/50 bg-surface-light/40 px-3 py-2">
                          <span className="label-uppercase text-slate-400">Aberta há</span>
                          <p className="mt-1 font-mono text-sm font-semibold text-slate-200">
                            {formatTime(table.openedAt)}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {table.status === TableStatus.Free ? (
                    <Dialog
                      open={isDialogOpen && selectedTable?.id === table.id}
                      onOpenChange={(open) => {
                        if (isBlocked) {
                          setShowRegisterModal(true);
                          return;
                        }
                        setIsDialogOpen(open);
                        if (open) setSelectedTable(table);
                      }}
                    >
                      <DialogContent className="border-surface-light bg-surface text-slate-100 sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl font-bold text-white">
                            Abrir Mesa {table.number}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="customerName" className="label-uppercase mb-2 block">
                              Nome do Cliente
                            </Label>
                            <Input
                              id="customerName"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Nome do cliente (opcional)"
                              className="border-surface-light bg-surface-light/50 text-slate-100 placeholder:text-slate-500"
                            />
                          </div>
                          <div>
                            <Label htmlFor="observations" className="label-uppercase mb-2 block">
                              Observações
                            </Label>
                            <Input
                              id="observations"
                              value={observations}
                              onChange={(e) => setObservations(e.target.value)}
                              placeholder="Observações (opcional)"
                              className="border-surface-light bg-surface-light/50 text-slate-100 placeholder:text-slate-500"
                            />
                          </div>
                          <Button
                            type="button"
                            disabled={openingTableId === table.id}
                            aria-busy={openingTableId === table.id}
                            onClick={() => handleOpenTable(table.id)}
                            className="w-full rounded-xl bg-emerald-600 py-3 font-bold uppercase tracking-widest text-white hover:bg-emerald-700 cursor-pointer"
                          >
                                    {openingTableId === table.id ? 'Abrindo mesa...' : 'Confirmar Abertura'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}

                  <Button
                    disabled={isBlocked && table.status === TableStatus.Free}
                    className={`mt-auto w-full rounded-xl py-3 font-bold uppercase tracking-widest text-white shadow-lg transition-all duration-300 cursor-pointer ${
                      isBlocked && table.status === TableStatus.Free
                        ? 'bg-slate-700/50 text-slate-500 border border-slate-700/50 cursor-not-allowed shadow-none'
                        : table.status === TableStatus.Free
                        ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/30'
                        : 'bg-accent-orange hover:bg-orange-600 hover:shadow-accent-orange/30'
                    }`}
                    onClick={() => {
                      if (table.status === TableStatus.Free) {
                        if (isBlocked) {
                          setShowRegisterModal(true);
                        } else {
                          setSelectedTable(table);
                          setIsDialogOpen(true);
                        }
                      } else {
                        router.push(`/orders/${table.id}`);
                      }
                    }}
                  >
                    {table.status === TableStatus.Free ? 'Abrir Mesa' : 'Gerenciar Mesa'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Cash Register Blocking/Opening Dialog */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="border-surface-light bg-surface text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-white text-center">
              Abertura de Caixa Requerida
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <p className="text-slate-300 text-center text-sm">
              Não existe um caixa aberto para hoje. Deseja abrir o caixa agora?
            </p>

            <div className="space-y-2">
              <Label htmlFor="openingBalance" className="label-uppercase text-xs text-slate-400 block font-bold">
                Valor Inicial do Caixa (Opcional)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">R$</span>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0,00"
                  className="border-surface-light bg-surface-light/50 pl-10 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleOpenRegister}
                className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold uppercase tracking-widest text-white hover:bg-emerald-700 cursor-pointer"
              >
                Abrir Caixa
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelRegister}
                className="flex-1 rounded-xl border-surface-light bg-surface-light/30 text-slate-300 hover:bg-surface-light hover:text-white cursor-pointer"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
