import { Fish, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login-selection";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="bg-white rounded-2xl shadow-xl p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <Fish className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Sistema de Gestão de Peso
              </h1>
              <p className="text-slate-600">Pesqueira - Controle de Produção</p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <LogIn className="h-5 w-5" />
                Entrar com Conta
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-slate-600">
                  Sistema seguro para funcionários da pesqueira
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
