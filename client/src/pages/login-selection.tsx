import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileHeader } from "@/components/ui/mobile-header";
import { UserCog, User, Fish } from "lucide-react";

export default function LoginSelection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileHeader 
        title="Selecione o Tipo de Login" 
        subtitle="Sistema de Controle de Peso"
        icon={<Fish className="h-6 w-6" />}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <UserCog className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-blue-600">
                Login do Administrador
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Gerenciar usuários, pesos e sistema
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation('/admin-login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
              >
                Entrar como Administrador
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-600">
                Login do Usuário
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Visualizar seus dados de peso
              </p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation('/user-login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
              >
                Entrar como Usuário
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}