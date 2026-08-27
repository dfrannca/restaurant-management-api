'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CashClosing, PaymentMethod } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  Eye, 
  TrendingUp, 
  DollarSign, 
  FolderOpen
} from 'lucide-react';

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  async function loadHistory() {
    console.info('[history] load started', { at: new Date().toISOString() });
    try {
      const data = await api.getCashClosings();
      setClosings(data);
      setLoadError(null);
      console.info('[history] state updated', { at: new Date().toISOString(), count: data.length });
    } catch (error) {
      setLoadError(error instanceof DOMException && error.name === 'AbortError'
        ? 'A API demorou muito para responder.'
        : 'Não foi possível carregar o histórico.');
      console.error('Failed to load cash closings history:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadHistory, 0);
    return () => clearTimeout(initialLoad);
  }, []);

  const handleViewDetails = async (closingId: number) => {
    try {
      const details = await api.getCashClosing(closingId);
      setSelectedClosing(details);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load cash closing details:', error);
      alert('Não foi possível carregar os detalhes deste caixa.');
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

  if (loading && closings.length === 0) {
    if (loadError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-graphite p-6">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <p className="text-slate-300">{loadError}</p>
            <Button onClick={() => { setLoadError(null); setLoading(true); void loadHistory(); }} className="bg-accent-orange text-white hover:bg-orange-600">
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-graphite">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-slate-400 label-uppercase">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-graphite flex flex-col">
      <div className="container mx-auto px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Title */}
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-white">Histórico de Caixas</h1>
          <p className="text-slate-400">Consulte os relatórios completos de todos os caixas encerrados.</p>
        </div>

        {/* History Table */}
        <Card className="rounded-2xl border-0 bg-surface shadow-lg p-6 ring-0 flex-1">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-surface-light hover:bg-transparent">
                  <TableHead className="label-uppercase text-slate-400 text-xs">Data</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs">Operador Responsável</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs">Abertura</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs">Fechamento</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs text-right">Total Vendido</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs text-center">Pedidos</TableHead>
                  <TableHead className="label-uppercase text-slate-400 text-xs text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                      <FolderOpen className="h-12 w-12 mx-auto opacity-30 mb-2" />
                      Nenhum fechamento registrado no sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  closings.map((closing) => {
                    return (
                      <TableRow key={closing.id} className="border-surface-light/40 hover:bg-surface-light/20">
                        <TableCell className="font-bold text-slate-200">{formatDate(closing.closingDate)}</TableCell>
                        <TableCell className="text-slate-300 font-medium">{closing.userName || 'Sistema'}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">{formatDateTime(closing.cashRegisterOpenedAt)}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">{formatDateTime(closing.cashRegisterClosedAt)}</TableCell>
                        <TableCell className="text-right font-extrabold text-accent">{formatCurrency(closing.totalSold)}</TableCell>
                        <TableCell className="text-center text-slate-300 font-semibold">{closing.totalOrders}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            onClick={() => handleViewDetails(closing.id)}
                            size="sm"
                            className="bg-surface-light/80 border border-surface-light text-slate-200 hover:bg-surface-light hover:text-white cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* History Details Dialog */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="border-surface-light bg-surface text-slate-100 sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold text-white text-center flex items-center justify-center gap-2">
              <FileText className="h-6 w-6 text-accent" />
              Detalhamento de Caixa do Dia {selectedClosing && formatDate(selectedClosing.closingDate)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClosing && (
            <div className="space-y-6 pt-4">
              {/* Metadata Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-surface-light/45 bg-surface-light/20 p-4">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Data</span>
                  <p className="text-sm font-semibold text-slate-200">{formatDate(selectedClosing.closingDate)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Abertura</span>
                  <p className="text-sm font-semibold text-slate-200">{formatDateTime(selectedClosing.cashRegisterOpenedAt)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Fechamento</span>
                  <p className="text-sm font-semibold text-slate-200">{formatDateTime(selectedClosing.cashRegisterClosedAt)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider font-bold">Operador</span>
                  <p className="text-sm font-semibold text-slate-200 truncate">{selectedClosing.userName}</p>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Saldo Inicial (Gaveta)</span>
                  <p className="text-lg font-bold text-slate-200 mt-0.5">{formatCurrency(selectedClosing.openingBalance)}</p>
                </div>
                <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Saldo Final Informado</span>
                  <p className="text-lg font-bold text-slate-200 mt-0.5">{formatCurrency(selectedClosing.closingBalance)}</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Mesas Fechadas</span>
                  <p className="text-xl font-bold text-slate-200 mt-0.5">
                    {new Set(selectedClosing.closedOrders?.map(o => o.tableId) || []).size}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Pedidos Finalizados</span>
                  <p className="text-xl font-bold text-slate-200 mt-0.5">{selectedClosing.totalOrders}</p>
                </div>
                <div className="rounded-xl border border-surface-light bg-surface-light/40 p-3 text-center col-span-2 md:col-span-1">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Ticket Médio</span>
                  <p className="text-xl font-bold text-slate-200 mt-0.5">{formatCurrency(selectedClosing.averageTicket)}</p>
                </div>
              </div>

              {/* Payment Method Details */}
              <div className="rounded-xl border border-surface-light bg-surface-light/30 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recebimentos detalhados</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                    <span className="text-slate-500 text-xxs uppercase block">Pix</span>
                    <span className="font-bold text-slate-300 text-sm">{formatCurrency(selectedClosing.totalPix)}</span>
                  </div>
                  <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                    <span className="text-slate-500 text-xxs uppercase block">Dinheiro</span>
                    <span className="font-bold text-slate-300 text-sm">{formatCurrency(selectedClosing.totalCash)}</span>
                  </div>
                  <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                    <span className="text-slate-500 text-xxs uppercase block">Débito</span>
                    <span className="font-bold text-slate-300 text-sm">{formatCurrency(selectedClosing.totalDebit)}</span>
                  </div>
                  <div className="bg-graphite/40 rounded-lg p-2.5 text-center">
                    <span className="text-slate-500 text-xxs uppercase block">Crédito</span>
                    <span className="font-bold text-slate-300 text-sm">{formatCurrency(selectedClosing.totalCredit)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-surface-light flex justify-between items-center">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Vendido</span>
                  <span className="text-xl font-extrabold text-accent">{formatCurrency(selectedClosing.totalSold)}</span>
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
                      {!selectedClosing.closedOrders || selectedClosing.closedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-slate-400 text-center py-4">Nenhuma mesa encerrada</TableCell>
                        </TableRow>
                      ) : (
                        selectedClosing.closedOrders.map((order) => (
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

              {/* Close Button */}
              <div className="flex pt-2">
                <Button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 rounded-xl bg-accent py-3 font-bold uppercase tracking-widest text-white hover:bg-orange-600 cursor-pointer"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
