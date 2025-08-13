import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/ui/mobile-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, User, TrendingUp, Calendar, Target, Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<"home" | "weight">("home");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: weightRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["/api/weight-records", "user"],
    queryFn: async () => {
      const response = await fetch('/api/weight-records', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch weight records');
      return response.json();
    }
  });

  const { data: userEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/earnings/user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/earnings/user/${user.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user earnings');
      return response.json();
    }
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.href = '/login-selection';
  };

  if (userLoading || recordsLoading || earningsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const renderHomeTab = () => (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meus Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nome:</span>
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">CPF:</span>
              <span className="font-medium">{user?.cpf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tipo de Trabalho:</span>
              <Badge variant="outline">{user?.workType}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard
          title="Peso Hoje"
          value={userEarnings?.dailyWeight ? `${userEarnings.dailyWeight.toFixed(1)}kg` : "0kg"}
          icon={<TrendingUp className="h-5 w-5" />}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatsCard
          title="Ganho Hoje"
          value={userEarnings?.dailyEarnings ? `R$ ${userEarnings.dailyEarnings.toFixed(2)}` : "R$ 0.00"}
          icon={<Award className="h-5 w-5" />}
          bgColor="bg-green-50 dark:bg-green-900/20"
        />
        <StatsCard
          title="Peso Mensal"
          value={userEarnings?.monthlyWeight ? `${userEarnings.monthlyWeight.toFixed(1)}kg` : "0kg"}
          icon={<Calendar className="h-5 w-5" />}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatsCard
          title="Ganho Mensal"
          value={userEarnings?.monthlyEarnings ? `R$ ${userEarnings.monthlyEarnings.toFixed(2)}` : "R$ 0.00"}
          icon={<Target className="h-5 w-5" />}
          bgColor="bg-orange-50 dark:bg-orange-900/20"
        />
      </div>

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {weightRecords && weightRecords.length > 0 ? (
              <div className="space-y-3">
                {weightRecords.slice(0, 5).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{record.weight}kg</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(record.recordDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{record.workType}</Badge>
                      {record.notes && (
                        <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum registro encontrado</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Informação:</strong> Você pode visualizar seus dados de peso, mas apenas administradores podem fazer alterações. Entre em contato com seu supervisor para registrar novos pesos.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderWeightTab = () => {
    // Calculate earnings for each weight record
    const getRecordEarnings = (record: any) => {
      if (!userEarnings?.pricePerKg) return 0;
      return parseFloat(record.weight) * userEarnings.pricePerKg;
    };

    return (
      <div className="space-y-6">
        {/* Earnings Summary */}
        {userEarnings && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-green-700 font-medium">Preço por Kg</p>
                <p className="text-2xl font-bold text-green-800">
                  R$ {userEarnings.pricePerKg.toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Tipo de trabalho: {user?.workType}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pesos e Ganhos</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {weightRecords && weightRecords.length > 0 ? (
                <div className="space-y-3">
                  {weightRecords.map((record: any) => {
                    const earnings = getRecordEarnings(record);
                    return (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium text-lg">{parseFloat(record.weight).toFixed(1)}kg</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {format(new Date(record.recordDate), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                R$ {earnings.toFixed(2)}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {record.workType}
                              </Badge>
                            </div>
                          </div>
                          {record.notes && (
                            <p className="text-xs text-gray-500 mt-2">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum registro encontrado</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <MobileHeader 
        title={user?.firstName ? `${user.firstName} ${user.lastName}` : "Usuário"} 
        subtitle="Visualizar Dados"
        icon={<User className="h-6 w-6" />}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        {activeTab === "home" && renderHomeTab()}
        {activeTab === "weight" && renderWeightTab()}
      </div>

      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "home" | "weight")}
        isAdmin={false}
      />
    </div>
  );
}