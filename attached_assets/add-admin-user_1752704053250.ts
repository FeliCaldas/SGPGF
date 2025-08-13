
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function updateUserToAdmin() {
  try {
    const user = await db.update(users)
      .set({
        isAdmin: true,
        firstName: "Usuário",
        lastName: "Admin"
      })
      .where(eq(users.cpf, "11658845935"))
      .returning();
    
    if (user.length > 0) {
      console.log("Usuário atualizado para administrador com sucesso:", user[0]);
    } else {
      console.log("Usuário não encontrado com CPF 11658845935");
    }
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
  } finally {
    process.exit(0);
  }
}

updateUserToAdmin();
