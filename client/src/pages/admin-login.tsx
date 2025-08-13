import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema, type AdminLogin } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/ui/mobile-header";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { UserCog, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AdminLogin>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      cpf: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLogin) => {
      const response = await apiRequest('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o painel administrativo...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "CPF ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AdminLogin) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileHeader 
        title="Login do Administrador" 
        subtitle="Sistema de Controle de Peso"
        icon={<UserCog className="h-6 w-6" />}
        onMenuClick={() => setLocation('/login-selection')}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={() => setLocation('/login-selection')}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-blue-600 dark:text-blue-400">
                <UserCog className="h-8 w-8 mx-auto mb-2" />
                Administrador
              </CardTitle>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Login com CPF e senha
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="Digite seu CPF (apenas números)"
                    maxLength={11}
                    {...form.register("cpf")}
                    className="text-lg"
                  />
                  {form.formState.errors.cpf && (
                    <p className="text-red-500 text-sm">{form.formState.errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    {...form.register("password")}
                    className="text-lg"
                  />
                  {form.formState.errors.password && (
                    <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
                  disabled={isLoading || loginMutation.isPending}
                >
                  {isLoading || loginMutation.isPending ? "Entrando..." : "Entrar como Administrador"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading && <LoadingOverlay />}
    </div>
  );
}