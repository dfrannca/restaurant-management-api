'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CashClosing, CashRegister, UserRole, PaymentMethod } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/UserContext';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Calendar, 
  User, 
  Clock, 
  Lock, 
  FileText, 
  Users, 
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

export default function CashRegisterPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  
  const [loading, setLoading] = useState(true);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [summary, setSummary] = useState<CashClosing | null>(null);
  
  // Closing Cash Register states
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingBalance, setClosingBalance] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  async function loadRegisterData() {
    try {
      const registerData = await api.getOpenCashRegister();
      if (registerData) {
        setActiveRegister(registerData);
        // Load summary metrics and closed orders
        const sumData = await api.getCurrentSummary();
        setSummary(sumData);
      } else {
        setActiveRegister(null);
        setSummary(null);
      }
    } catch {
      setActiveRegister(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadRegisterData, 0);
    const interval = setInterval(loadRegisterData, 10000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  const handleCloseRegister = async () => {
    if (!activeRegister || isClosing) return;
    
    try {
      setIsClosing(true);
      const balanceValue = parseFloat(closingBalance) || 0;
      await api.closeCashRegister({ closingBalance: balanceValue });
      
      // Reset local states
      setActiveRegister(null);
      setSummary(null);
      setShowCloseModal(false);
      setClosingBalance('');
      
      // Dispatch register changed event
      window.dispatchEvent(new Event('cashRegisterChanged'));
      
      alert('Caixa fechado com sucesso!');
      router.push('/');
    } catch (error) {
      console.error('Failed to close cash register:', error);
      alert((error as Error).message || 'Falha ao fechar o caixa');
    } finally {
      setIsClosing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPaymentMethodText = (method?: PaymentMethod) => {
    if (method === undefined || method === null) return 'Desconhecido';
    switch (method) {
      case PaymentMethod.Cash:
        return 'Dinheiro';
      case PaymentMethod.Pix:
        return 'Pix';
      case PaymentMethod.DebitCard:
        return 'Cartão de Débito';
      case PaymentMethod.CreditCard:
        return 'Cartão de Crédito';
      default:
        return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-graphite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-slate-400 label-uppercase">Carregando dados do caixa...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === UserRole.Administrator;

  // Render Closed/No active register state
  if (!activeRegister || !summary) {
    return (
      <div className="min-h-screen bg-graphite flex flex-col justify-center items-center p-6">
        <Card className="max-w-md w-full rounded-2xl border-0 bg-surface shadow-xl p-8 text-center ring-0">
          <div className="mx-auto mb-4 h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8" />
          </div>
          <CardTitle className="font-heading text-2xl font-extrabold text-white mb-2">
            Caixa Fechado
          </CardTitle>
          <p className="text-slate-400 text-sm mb-6">
            Não há nenhum caixa aberto para o dia de hoje no momento. Volte para o painel de mesas para abrir o caixa.
          </p>
          <Button
            onClick={() => router.push('/')}
            className="w-full rounded-xl bg-accent py-3 font-bold uppercase tracking-widest text-white hover:bg-orange-600 cursor-pointer shadow-lg hover:shadow-accent/20"
          >
            Ir para Painel de Mesas
          </Button>
        </Card>
      </div>
    );
  }

  // Count distinct tables
  const distinctTablesCount = new Set(summary.closedOrders?.map(o => o.tableId)).size;

  return (
    <div className="min-h-screen bg-graphite flex flex-col">
      <div className="container mx-auto px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Title and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-white">Controle de Caixa</h1>
            <p className="text-slate-400">Acompanhe as vendas e fechamentos em tempo real.</p>
          </div>
          
          <div>
            {isAdmin ? (
              <Button
                onClick={() => setShowCloseModal(true)}
                className="w-full sm:w-auto rounded-xl bg-red-600 px-6 py-3 font-bold uppercase tracking-widest text-white hover:bg-red-700 cursor-pointer shadow-lg hover:shadow-red-500/20"
              >
                Fechar Caixa
              </Button>
            ) : (
              <div className="flex flex-col items-center sm:items-end gap-1.5">
                <Button
                  disabled
                  className="w-full sm:w-auto rounded-xl bg-slate-700/50 text-slate-500 border border-slate-700/50 cursor-not-allowed font-bold uppercase tracking-widest"
                >
                  Fechar Caixa
                </Button>
                <span className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Apenas Admin pode fechar
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-xl border-0 bg-surface shadow-md p-5 ring-0 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <span className="label-uppercase text-xs text-slate-400">Data</span>
              <p className="text-base font-bold text-slate-100">{formatDate(activeRegister.openedAt)}</p>
            </div>
          </Card>

          <Card className="rounded-xl border-0 bg-surface shadow-md p-5 ring-0 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="label-uppercase text-xs text-slate-400">Abertura</span>
              <p className="text-base font-bold text-slate-100">{formatDateTime(activeRegister.openedAt)}</p>
            </div>
          </Card>

          <Card className="rounded-xl border-0 bg-surface shadow-md p-5 ring-0 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <span className="label-uppercase text-xs text-slate-400">Responsável</span>
              <p className="text-base font-bold text-slate-100 truncate max-w-[150px]">{activeRegister.userName}</p>
            </div>
          </Card>

          <Card className="rounded-xl border-0 bg-surface shadow-md p-5 ring-0 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="label-uppercase text-xs text-slate-400">Valor Inicial</span>
              <p className="text-base font-bold text-slate-100">{formatCurrency(activeRegister.openingBalance)}</p>
            </div>
          </Card>
        </div>

        {/* Real-time Sales Metrics & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-stretch">
          {/* Closed Tables List */}
          <Card className="lg:col-span-2 rounded-2xl border-0 bg-surface shadow-lg p-6 ring-0 flex flex-col">
            <h3 className="font-heading text-lg font-bold uppercase tracking-widest text-white border-b border-surface-light/40 pb-4 mb-4">
              Vendas e Mesas Encerradas
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-2">
              {summary.closedOrders?.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400">
                  <ShoppingCart className="h-12 w-12 opacity-30 mb-2" />
                  <p className="text-sm">Nenhuma mesa foi encerrada hoje ainda.</p>
                </div>
              ) : (
                summary.closedOrders?.map((order) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center rounded-xl border border-surface-light/40 bg-surface-light/20 px-5 py-4 transition-all hover:bg-surface-light/30"
                  >
                    <div>
                      <p className="font-heading font-bold text-white text-base">
                        Mesa {order.tableNumber.toString().padStart(2, '0')}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {order.closedAt ? formatDateTime(order.closedAt) : ''}
                        </span>
                        <span>•</span>
                        <span className="bg-surface-light/75 px-2 py-0.5 rounded text-slate-300 font-medium">
                          {getPaymentMethodText(order.paymentMethod)}
                        </span>
                        {order.customerName && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 truncate max-w-[100px]">{order.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-heading font-extrabold text-accent text-lg">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-xxs text-slate-500 uppercase tracking-wider mt-0.5">
                        Resp: {order.userName || activeRegister.userName}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Totals Panel */}
          <Card className="rounded-2xl border-0 bg-surface shadow-lg p-6 ring-0 flex flex-col justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold uppercase tracking-widest text-white border-b border-surface-light/40 pb-4 mb-4">
                Totais Acumulados
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-surface-light/30 pb-2">
                  <span className="text-slate-400 flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0 text-slate-500" /> Mesas Fechadas</span>
                  <span className="font-bold text-slate-100">{distinctTablesCount}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm border-b border-surface-light/30 pb-2">
                  <span className="text-slate-400 flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 shrink-0 text-slate-500" /> Pedidos Finalizados</span>
                  <span className="font-bold text-slate-100">{summary.totalOrders}</span>
                </div>

                <div className="space-y-2 mt-4 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Por Forma de Pagamento</span>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Pix</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(summary.totalPix)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Dinheiro</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(summary.totalCash)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">C. Débito</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(summary.totalDebit)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">C. Crédito</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(summary.totalCredit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-surface-light/40">
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
                <span className="label-uppercase text-xs text-accent">Total Vendido</span>
                <p className="font-heading text-3xl font-extrabold text-accent mt-1">
                  {formatCurrency(summary.totalSold)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Summary Dialog */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="border-surface-light bg-surface text-slate-100 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold text-white text-center flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-accent" />
              Relatório de Fechamento de Caixa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Metadata Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-surface-light/45 bg-surface-light/20 p-4">
              <div>
                <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Data</span>
                <p className="text-sm font-semibold text-slate-200">{formatDate(activeRegister.openedAt)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Abertura</span>
                <p className="text-sm font-semibold text-slate-200">{formatDateTime(activeRegister.openedAt)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Fechamento</span>
                <p className="text-sm font-semibold text-slate-200">{formatDateTime(new Date().toISOString())}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Responsável</span>
                <p className="text-sm font-semibold text-slate-200 truncate">{activeRegister.userName}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                <span className="text-slate-400 text-xxs uppercase tracking-wider block">Mesas Atendidas</span>
                <p className="text-xl font-bold text-slate-200 mt-0.5">{distinctTablesCount}</p>
              </div>
              <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                <span className="text-slate-400 text-xxs uppercase tracking-wider block">Pedidos Finalizados</span>
                <p className="text-xl font-bold text-slate-200 mt-0.5">{summary.totalOrders}</p>
              </div>
              <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center col-span-2 md:col-span-1">
                <span className="text-slate-400 text-xxs uppercase tracking-wider block">Ticket Médio</span>
                <p className="text-xl font-bold text-slate-200 mt-0.5">{formatCurrency(summary.averageTicket)}</p>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="rounded-xl border border-surface-light bg-surface-light/30 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recebimentos detalhados</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                  <span className="text-slate-500 text-xxs uppercase block">Pix</span>
                  <span className="font-bold text-slate-300 text-sm">{formatCurrency(summary.totalPix)}</span>
                </div>
                <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                  <span className="text-slate-500 text-xxs uppercase block">Dinheiro</span>
                  <span className="font-bold text-slate-300 text-sm">{formatCurrency(summary.totalCash)}</span>
                </div>
                <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                  <span className="text-slate-500 text-xxs uppercase block">Débito</span>
                  <span className="font-bold text-slate-300 text-sm">{formatCurrency(summary.totalDebit)}</span>
                </div>
                <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                  <span className="text-slate-500 text-xxs uppercase block">Crédito</span>
                  <span className="font-bold text-slate-300 text-sm">{formatCurrency(summary.totalCredit)}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-light flex justify-between items-center">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Vendido</span>
                <span className="text-xl font-extrabold text-accent">{formatCurrency(summary.totalSold)}</span>
              </div>
            </div>

            {/* Closed Tables Details */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mesas Encerradas</h4>
              <div className="border border-surface-light rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-surface-light/50">
                    <TableRow className="border-surface-light">
                      <TableHead className="text-slate-400 label-uppercase text-xxs">Mesa</TableHead>
                      <TableHead className="text-slate-400 label-uppercase text-xxs">Cliente</TableHead>
                      <TableHead className="text-slate-400 label-uppercase text-xxs">Abertura</TableHead>
                      <TableHead className="text-slate-400 label-uppercase text-xxs">Fechamento</TableHead>
                      <TableHead className="text-slate-400 label-uppercase text-xxs">Pagamento</TableHead>
                      <TableHead className="text-slate-400 label-uppercase text-xxs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.closedOrders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-slate-400 text-center py-4">Nenhuma mesa encerrada</TableCell>
                      </TableRow>
                    ) : (
                      summary.closedOrders?.map((order) => (
                        <TableRow key={order.id} className="border-surface-light hover:bg-surface-light/20">
                          <TableCell className="font-bold text-slate-200">Mesa {order.tableNumber}</TableCell>
                          <TableCell className="text-slate-300 text-xs">{order.customerName || '-'}</TableCell>
                          <TableCell className="text-slate-400 text-xxs font-mono">{formatDateTime(order.openedAt)}</TableCell>
                          <TableCell className="text-slate-400 text-xxs font-mono">{order.closedAt ? formatDateTime(order.closedAt) : ''}</TableCell>
                          <TableCell className="text-slate-300 text-xs">{getPaymentMethodText(order.paymentMethod)}</TableCell>
                          <TableCell className="text-right font-semibold text-accent">{formatCurrency(order.totalAmount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Input Closing Balance */}
            <div className="space-y-2 border-t border-surface-light/40 pt-4">
              <Label htmlFor="closingBalance" className="label-uppercase text-xs text-slate-400 block font-bold">
                Valor de Fechamento do Caixa (Saldo Final em Dinheiro/Total)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">R$</span>
                <Input
                  id="closingBalance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="0,00"
                  className="border-surface-light bg-surface-light/50 pl-10 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <p className="text-xxs text-slate-500">
                Informe o saldo atual disponível na gaveta/caixa para conciliação final.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleCloseRegister}
                disabled={isClosing || closingBalance === ''}
                className="flex-1 rounded-xl bg-red-600 py-3 font-bold uppercase tracking-widest text-white hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? 'Fechando...' : 'Confirmar Fechamento'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 rounded-xl border-surface-light bg-surface-light/30 text-slate-300 hover:bg-surface-light hover:text-white cursor-pointer"
              >
                Voltar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
