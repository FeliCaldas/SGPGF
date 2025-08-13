import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userLoginSchema, type UserLogin } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/ui/mobile-header";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { User, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function UserLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserLogin>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      cpf: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: UserLogin) => {
      const response = await apiRequest('/api/auth/user-login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para seus dados...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "CPF não encontrado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UserLogin) => {
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
        title="Login do Usuário" 
        subtitle="Sistema de Controle de Peso"
        icon={<User className="h-6 w-6" />}
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
              <CardTitle className="text-center text-2xl font-bold text-green-600 dark:text-green-400">
                <User className="h-8 w-8 mx-auto mb-2" />
                Usuário
              </CardTitle>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Login apenas com CPF
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

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
                  disabled={isLoading || loginMutation.isPending}
                >
                  {isLoading || loginMutation.isPending ? "Entrando..." : "Entrar como Usuário"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Informação:</strong> Como usuário, você poderá visualizar seus dados de peso, mas não poderá editá-los. Apenas administradores podem fazer alterações.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isLoading && <LoadingOverlay />}
    </div>
  );
}