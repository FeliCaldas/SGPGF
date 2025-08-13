import { storage } from "./server/storage";
import { hashPassword } from "./server/auth";

async function addAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByCpf("11658845935");
    if (existingUser) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword("lipe2008");
    const adminUser = await storage.createUser({
      cpf: "11658845935",
      password: hashedPassword,
      firstName: "Felipe",
      lastName: "Admin",
      email: "admin@pesqueira.com",
      isAdmin: true,
      workType: "Administração",
      isActive: true,
    });

    console.log("Admin user created successfully:", { ...adminUser, password: undefined });
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

addAdminUser();