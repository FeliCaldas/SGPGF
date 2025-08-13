import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Users, Scale, BarChart3, PlusCircle, Save, Plus, MoreVertical, ClipboardList, Trash2, Calendar, Settings, AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { MobileHeader } from "@/components/ui/mobile-header";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

const weightRecordSchema = z.object({
  userId: z.string().min(1, "Funcionário é obrigatório"),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho é obrigatório",
  }),
  weight: z.string().min(1, "Peso é obrigatório"),
  recordDate: z.string().min(1, "Data é obrigatória"),
  notes: z.string().optional(),
});

const userSchema = z.object({
  cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  password: z.string().optional(),
  isAdmin: z.boolean().default(false),
  workType: z.enum(["Filetagem", "Espinhos"], {
    required_error: "Tipo de trabalho é obrigatório",
  }),
  isActive: z.boolean().default(true),
}).refine(data => !data.isAdmin || (data.password && data.password.length >= 4), {
  message: "Senha é obrigatória para administradores e deve ter pelo menos 4 caracteres",
  path: ["password"],
});

const settingsSchema = z.object({
  file_price_per_kg: z.string().min(1, "Preço do filé é obrigatório"),
  spine_price_per_kg: z.string().min(1, "Preço do espinho é obrigatório"),
});

type WeightRecordForm = z.infer<typeof weightRecordSchema>;
type UserForm = z.infer<typeof userSchema>;
type SettingsForm = z.infer<typeof settingsSchema>;

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "weight" | "allweights" | "users" | "settings">("home");
  const [dateFilter, setDateFilter] = useState<"today" | "month">("today");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);

  // Redirect non-admin users away from restricted tabs
  useEffect(() => {
    if (user && !user.isAdmin && (activeTab === "users" || activeTab === "settings" || activeTab === "allweights")) {
      setActiveTab("home");
    }
  }, [user, activeTab]);

  // Get current date in Brazilian timezone (UTC-3)
  const getCurrentDate = () => {
    // Create a new date and adjust to Brazilian timezone
    const now = new Date();
    // Create date string in Brazilian timezone
    const brazilDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const year = brazilDate.getFullYear();
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
    const day = String(brazilDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display in Brazilian format (dd/MM/yyyy)
  const formatBrazilianDate = (dateString: string) => {
    if (!dateString) return '';
    // Parse the date string and create a date at noon to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const form = useForm<WeightRecordForm>({
    resolver: zodResolver(weightRecordSchema),
    defaultValues: {
      userId: "",
      workType: "Filetagem",
      weight: "",
      notes: "",
      recordDate: getCurrentDate(),
    },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      cpf: "",
      password: "",
      firstName: "",
      lastName: "",
      isAdmin: false,
      workType: "Filetagem",
      isActive: true,
    },
  });

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      file_price_per_kg: "",
      spine_price_per_kg: "",
    },
  });

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/daily-stats"],
    enabled: isAuthenticated,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated && user?.isAdmin,
  });

  const { data: regularUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/active"],
    enabled: isAuthenticated,
  });

  const { data: allUsers, isLoading: allUsersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && user?.isAdmin,
  });

  const { data: userEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/earnings/users"],
    enabled: isAuthenticated && user?.isAdmin,
  });

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const brazilDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    if (dateFilter === "today") {
      const todayStr = getCurrentDate();
      return {
        startDate: todayStr,
        endDate: todayStr
      };
    } else {
      // Month filter
      const year = brazilDate.getFullYear();
      const month = brazilDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      return {
        startDate: firstDayStr,
        endDate: lastDayStr
      };
    }
  };

  const { data: weightRecords, isLoading: weightsLoading } = useQuery({
    queryKey: ['/api/weight-records', dateFilter],
    enabled: activeTab === "weight" && isAuthenticated,
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(`/api/weight-records?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch weight records');
      return response.json();
    }
  });

  // Add query for all weight records (for admin tab)
  const { data: allWeightRecords, isLoading: allWeightsLoading } = useQuery({
    queryKey: ['/api/weight-records-all'],
    enabled: isAuthenticated && user?.isAdmin && activeTab === "allweights",
    queryFn: async () => {
      const response = await fetch(`/api/weight-records`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch all weight records');
      return response.json();
    }
  });

  // Mutations
  const createWeightRecord = useMutation({
    mutationFn: async (data: WeightRecordForm) => {
      const response = await apiRequest("/api/weight-records", {
        method: "POST",
        body: JSON.stringify({
          userId: parseInt(data.userId),
          workType: data.workType,
          weight: parseFloat(data.weight),
          recordDate: data.recordDate,
          notes: data.notes,
        }),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/daily-stats"] });
      toast({
        title: "Sucesso",
        description: "Peso registrado com sucesso!",
      });
      form.reset({
        userId: "",
        workType: "Filetagem",
        weight: "",
        notes: "",
        recordDate: getCurrentDate(),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao registrar peso. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteWeightRecordMutation = useMutation({
    mutationFn: async (recordId: number) => {
      const response = await apiRequest(`/api/weight-records/${recordId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weight-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weight-records-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/daily-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/earnings/users"] });
      toast({
        title: "Registro deletado",
        description: "O registro de peso foi deletado com sucesso.",
      });
      setDeleteRecordId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar registro",
        description: error.message || "Ocorreu um erro ao deletar o registro.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: WeightRecordForm) => {
    setIsSubmitting(true);
    try {
      await createWeightRecord.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (data: UserForm) => {
      const response = await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/daily-stats"] });
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      userForm.reset();
      setIsAddUserDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao criar usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onUserSubmit = async (data: UserForm) => {
    try {
      await createUser.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/users/${userId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/daily-stats"] });
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao remover usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Settings mutations
  const updateSettings = useMutation({
    mutationFn: async (data: SettingsForm) => {
      await Promise.all([
        apiRequest(`/api/settings/file_price_per_kg`, {
          method: "PUT",
          body: JSON.stringify({ value: data.file_price_per_kg }),
        }),
        apiRequest(`/api/settings/spine_price_per_kg`, {
          method: "PUT",
          body: JSON.stringify({ value: data.spine_price_per_kg }),
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSettingsSubmit = async (data: SettingsForm) => {
    setIsSubmitting(true);
    try {
      await updateSettings.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    if (confirm(`Tem certeza que deseja remover o usuário ${userName}?`)) {
      deleteUser.mutate(userId);
    }
  };

  // Load settings into form
  useEffect(() => {
    if (settings) {
      const filePrice = settings.find(s => s.key === 'file_price_per_kg')?.value || '';
      const spinePrice = settings.find(s => s.key === 'spine_price_per_kg')?.value || '';
      settingsForm.reset({
        file_price_per_kg: filePrice,
        spine_price_per_kg: spinePrice,
      });
    }
  }, [settings, settingsForm]);

  // Handle logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Não autorizado",
        description: "Fazendo login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  if (authLoading) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatsCard
                title="Usuários Ativos"
                value={statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.activeUsers || 0}
                icon={<Users className="h-5 w-5 text-primary" />}
                bgColor="bg-primary/10"
              />
              <StatsCard
                title="Faturamento Mensal"
                value={statsLoading ? <Skeleton className="h-8 w-16" /> : `R$ ${(stats?.totalMonthlyEarnings || 0).toFixed(2)}`}
                icon={<BarChart3 className="h-5 w-5 text-green-600" />}
                bgColor="bg-green-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                title="Total do Dia"
                value={statsLoading ? <Skeleton className="h-8 w-16" /> : `${(stats?.todayWeight || 0).toFixed(1)}kg`}
                icon={<Scale className="h-5 w-5 text-blue-600" />}
                bgColor="bg-blue-50"
              />
              <StatsCard
                title="Total do Mês"
                value={statsLoading ? <Skeleton className="h-8 w-16" /> : `${(stats?.monthlyWeight || 0).toFixed(1)}kg`}
                icon={<Scale className="h-5 w-5 text-green-600" />}
                bgColor="bg-green-50"
              />
            </div>

            {/* User Weights Section */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Peso dos Funcionários
                </h2>
                
                <div className="space-y-3">
                  {usersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    ))
                  ) : (
                    regularUsers?.filter((user: any) => !user.isAdmin).map((user: any) => {
                      const userEarning = userEarnings?.find((earning: any) => earning.userId === user.id);
                      return (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              user.isActive ? 'bg-green-100' : 'bg-slate-200'
                            }`}>
                              <span className={`font-medium text-sm ${
                                user.isActive ? 'text-green-600' : 'text-slate-600'
                              }`}>
                                {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-slate-600">
                                {user.workType || 'Não definido'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">
                              {userEarning?.dailyWeight ? `${userEarning.dailyWeight.toFixed(1)}kg` : '0kg'}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              R$ {userEarning?.dailyEarnings ? userEarning.dailyEarnings.toFixed(2) : '0.00'}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Mês: {userEarning?.monthlyWeight ? `${userEarning.monthlyWeight.toFixed(1)}kg` : '0kg'} 
                              • R$ {userEarning?.monthlyEarnings ? userEarning.monthlyEarnings.toFixed(2) : '0.00'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  {regularUsers?.filter((user: any) => !user.isAdmin).length === 0 && !usersLoading && (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Nenhum funcionário encontrado</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </>
        );
      case "weight":
        return (
          <>
            {/* Weight Entry Form */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Registrar Peso
                </h2>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="userId" className="text-sm font-medium text-slate-700">
                      Funcionário
                    </Label>
                    <Select
                      value={form.watch("userId")}
                      onValueChange={(value) => form.setValue("userId", value)}
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersLoading ? (
                          <SelectItem value="loading">Carregando...</SelectItem>
                        ) : (
                          regularUsers?.filter((user: any) => !user.isAdmin).map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.userId && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.userId.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="workType" className="text-sm font-medium text-slate-700">
                      Tipo de Trabalho
                    </Label>
                    <Select
                      value={form.watch("workType")}
                      onValueChange={(value) => form.setValue("workType", value)}
                    >
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Filetagem">Filetagem</SelectItem>
                        <SelectItem value="Espinhos">Espinhos</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.workType && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.workType.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="weight" className="text-sm font-medium text-slate-700">
                      Peso (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="mt-2"
                      {...form.register("weight")}
                    />
                    {form.formState.errors.weight && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.weight.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="recordDate" className="text-sm font-medium text-slate-700">
                      Data do Registro
                    </Label>
                    <Input
                      id="recordDate"
                      type="date"
                      className="mt-2"
                      {...form.register("recordDate")}
                    />
                    {form.formState.errors.recordDate && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.recordDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                      Observações (opcional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Adicione observações sobre o registro..."
                      rows={3}
                      className="mt-2 resize-none"
                      {...form.register("notes")}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Save className="h-5 w-5" />
                    {isSubmitting ? "Salvando..." : "Salvar Registro"}
                  </Button>
                </form>
              </CardContent>
            </Card>



            {/* Weight Records List */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Registros de Peso
                  </h2>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={dateFilter === "today" ? "default" : "outline"}
                      onClick={() => setDateFilter("today")}
                    >
                      Hoje
                    </Button>
                    <Button 
                      size="sm" 
                      variant={dateFilter === "month" ? "default" : "outline"}
                      onClick={() => setDateFilter("month")}
                    >
                      Mês
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {weightsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))
                  ) : (
                    weightRecords?.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium text-sm text-primary">
                              {record.user.firstName?.charAt(0) || 'U'}{record.user.lastName?.charAt(0) || 'S'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {record.user.firstName} {record.user.lastName}
                            </p>
                            <p className="text-sm text-slate-600">
                              {record.workType} • {formatBrazilianDate(record.recordDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {record.weight}kg
                          </p>
                          {record.notes && (
                            <p className="text-xs text-slate-500 max-w-20 truncate">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  
                  {weightRecords?.length === 0 && !weightsLoading && (
                    <div className="text-center py-8 text-slate-500">
                      <ClipboardList className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Nenhum registro encontrado para {dateFilter === "today" ? "hoje" : "este mês"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "users":
        if (!user?.isAdmin) {
          return null;
        }
        return (
          <>
            {/* User Management */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Gerenciar Usuários
                  </h2>
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2 hover:bg-slate-100 rounded-lg">
                        <Plus className="h-5 w-5 text-slate-600" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Usuário</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">Nome</Label>
                            <Input
                              id="firstName"
                              placeholder="Nome"
                              {...userForm.register("firstName")}
                            />
                            {userForm.formState.errors.firstName && (
                              <p className="text-red-500 text-sm mt-1">
                                {userForm.formState.errors.firstName.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input
                              id="lastName"
                              placeholder="Sobrenome"
                              {...userForm.register("lastName")}
                            />
                            {userForm.formState.errors.lastName && (
                              <p className="text-red-500 text-sm mt-1">
                                {userForm.formState.errors.lastName.message}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            placeholder="00000000000"
                            maxLength={11}
                            {...userForm.register("cpf")}
                          />
                          {userForm.formState.errors.cpf && (
                            <p className="text-red-500 text-sm mt-1">
                              {userForm.formState.errors.cpf.message}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isAdmin"
                            checked={userForm.watch("isAdmin")}
                            onCheckedChange={(checked) => userForm.setValue("isAdmin", checked)}
                          />
                          <Label htmlFor="isAdmin">Administrador</Label>
                        </div>
                        
                        {userForm.watch("isAdmin") && (
                          <div>
                            <Label htmlFor="password">Senha (obrigatória para administradores)</Label>
                            <Input
                              id="password"
                              type="password"
                              placeholder="Senha"
                              {...userForm.register("password")}
                            />
                            {userForm.formState.errors.password && (
                              <p className="text-red-500 text-sm mt-1">
                                {userForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="workType">Tipo de Trabalho</Label>
                          <Select
                            value={userForm.watch("workType")}
                            onValueChange={(value) => userForm.setValue("workType", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Filetagem">Filetagem</SelectItem>
                              <SelectItem value="Espinhos">Espinhos</SelectItem>
                            </SelectContent>
                          </Select>
                          {userForm.formState.errors.workType && (
                            <p className="text-red-500 text-sm mt-1">
                              {userForm.formState.errors.workType.message}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isActive"
                            checked={userForm.watch("isActive")}
                            onCheckedChange={(checked) => userForm.setValue("isActive", checked)}
                          />
                          <Label htmlFor="isActive">Ativo</Label>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddUserDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={createUser.isPending}
                          >
                            {createUser.isPending ? "Criando..." : "Criar Usuário"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {allUsersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-4" />
                      </div>
                    ))
                  ) : (
                    allUsers?.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            user.isActive ? 'bg-primary/20' : 'bg-slate-200'
                          }`}>
                            <span className={`font-medium text-sm ${
                              user.isActive ? 'text-primary' : 'text-slate-600'
                            }`}>
                              {user.firstName?.charAt(0) || 'U'}{user.lastName?.charAt(0) || 'S'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className={`text-sm ${user.isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                              {user.workType || 'Não definido'} • {user.isActive ? 'Ativo' : 'Inativo'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 hover:bg-slate-200 rounded"
                          onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        );
      case "settings":
        if (!user?.isAdmin) {
          return null;
        }
        return (
          <>
            {/* Settings Configuration */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Configurações
                  </h2>
                </div>
                
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="file_price_per_kg" className="text-sm font-medium text-slate-700">
                      Preço do Filé por Kg (R$)
                    </Label>
                    <Input
                      id="file_price_per_kg"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-2"
                      {...settingsForm.register("file_price_per_kg")}
                    />
                    {settingsForm.formState.errors.file_price_per_kg && (
                      <p className="text-red-500 text-sm mt-1">
                        {settingsForm.formState.errors.file_price_per_kg.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="spine_price_per_kg" className="text-sm font-medium text-slate-700">
                      Preço do Espinho por Kg (R$)
                    </Label>
                    <Input
                      id="spine_price_per_kg"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-2"
                      {...settingsForm.register("spine_price_per_kg")}
                    />
                    {settingsForm.formState.errors.spine_price_per_kg && (
                      <p className="text-red-500 text-sm mt-1">
                        {settingsForm.formState.errors.spine_price_per_kg.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    disabled={isSubmitting || updateSettings.isPending}
                  >
                    <Save className="h-5 w-5" />
                    {isSubmitting || updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        );

      case "allweights":
        if (!user?.isAdmin) {
          return null;
        }
        
        // Calculate earnings for each record
        const getRecordEarnings = (record: any) => {
          const pricePerKg = record.workType === 'Filetagem' 
            ? parseFloat(settings?.find((s: any) => s.key === 'file_price_per_kg')?.value || '0')
            : parseFloat(settings?.find((s: any) => s.key === 'spine_price_per_kg')?.value || '0');
          return parseFloat(record.weight) * pricePerKg;
        };

        return (
          <>
            {/* All Weight Records */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Todos os Registros de Peso e Faturamento
                </h2>
                
                <div className="space-y-3">
                  {allWeightsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    ))
                  ) : allWeightRecords?.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Scale className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                      <p>Nenhum registro de peso encontrado</p>
                    </div>
                  ) : (
                    allWeightRecords?.map((record: any) => {
                      const earnings = getRecordEarnings(record);
                      return (
                        <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="font-medium text-sm text-primary">
                                {record.user?.firstName?.charAt(0) || 'U'}{record.user?.lastName?.charAt(0) || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {record.user?.firstName} {record.user?.lastName}
                              </p>
                              <p className="text-sm text-slate-600">
                                {record.workType} • {formatBrazilianDate(record.recordDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {parseFloat(record.weight).toFixed(1)}kg
                              </p>
                              <p className="text-sm font-semibold text-green-600">
                                R$ {earnings.toFixed(2)}
                              </p>
                              {record.notes && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {record.notes}
                                </p>
                              )}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir este registro de peso?
                                    <br />
                                    <br />
                                    <strong>Funcionário:</strong> {record.user?.firstName} {record.user?.lastName}
                                    <br />
                                    <strong>Peso:</strong> {parseFloat(record.weight).toFixed(1)}kg
                                    <br />
                                    <strong>Data:</strong> {formatBrazilianDate(record.recordDate)}
                                    <br />
                                    <strong>Valor:</strong> R$ {earnings.toFixed(2)}
                                    <br />
                                    <br />
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteWeightRecordMutation.mutate(record.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Total Summary */}
                {allWeightRecords && allWeightRecords.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-600">Total de Registros</p>
                        <p className="text-lg font-bold text-slate-900">
                          {allWeightRecords.length} registros
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Faturamento Total</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {allWeightRecords.reduce((total: number, record: any) => 
                            total + getRecordEarnings(record), 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileHeader 
        title="Painel Admin"
        subtitle="Gestão de Usuários e Pesos"
        icon={<Users className="h-5 w-5" />}
        onLogout={() => {
          apiRequest('/api/auth/logout', { method: 'POST' })
            .then(() => window.location.href = '/login-selection')
            .catch(() => window.location.href = '/login-selection');
        }}
      />

      <main className="p-4 space-y-6 pb-20">
        {renderContent()}
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as "home" | "weight" | "allweights" | "users" | "settings")} 
        isAdmin={user?.isAdmin || false}
      />
    </div>
  );
}