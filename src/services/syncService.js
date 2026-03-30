// src/services/syncService.js
import axios from "axios";
import { API_URL } from "../../constants";
import databaseService from "../database";

export const SyncService = {
  // Sync missing employees from server to local
  syncMissingEmployees: async (user, authToken, businessServerId) => {
    try {
      console.log("🔄 Syncing missing employees for business:", businessServerId);

      // 1. Get all employees from server for this business
      const response = await axios.get(
        `${API_URL}/shops/employees/?business_id=${businessServerId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to fetch employees from server");
      }

      const serverEmployees = response.data.employees;
      console.log(`📥 Retrieved ${serverEmployees.length} employees from server`);

      let syncedCount = 0;
      let errorCount = 0;

      // 2. Process each employee
      for (const serverEmployee of serverEmployees) {
        try {
          // Check if employee already exists locally by server_id
          const existingEmployee = await databaseService.EmployeeService.getEmployeeById(
            serverEmployee.id
          );

          if (!existingEmployee) {
            console.log(`➕ Adding missing employee: ${serverEmployee.user?.first_name} ${serverEmployee.user?.last_name}`);

            // Get or create the user first
            let userId = null;
            if (serverEmployee.user) {
              const userResult = await databaseService.UserService.saveUser({
                id: serverEmployee.user.id,
                server_id: serverEmployee.user.id,
                username: serverEmployee.user.username || serverEmployee.user.email?.split('@')[0],
                email: serverEmployee.user.email,
                first_name: serverEmployee.user.first_name,
                last_name: serverEmployee.user.last_name,
                phone_number: serverEmployee.user.phone_number || "",
                user_type: "employee",
                is_active: serverEmployee.user.is_active !== false ? 1 : 0,
                last_login: serverEmployee.user.last_login,
                date_joined: serverEmployee.user.date_joined,
                profile_picture: serverEmployee.user.profile_picture || null,
              });

              if (userResult && userResult.id) {
                userId = userResult.id;
              }
            }

            // Get the local business ID for this employee
            const localBusiness = await databaseService.BusinessService.getBusinessByServerId(
              businessServerId
            );

            if (!localBusiness) {
              console.warn(`⚠️ No local business found for server ID: ${businessServerId}`);
              continue;
            }

            // Get or create the role
            if (serverEmployee.role) {
              await databaseService.RoleService.saveRole({
                id: serverEmployee.role.id,
                server_id: serverEmployee.role.id,
                name: serverEmployee.role.name,
                role_type: serverEmployee.role.type,
                description: serverEmployee.role.description || "",
                is_default: serverEmployee.role.is_default || false,
              });
            }

            // Prepare employee data for local storage
            const employeeData = {
              id: serverEmployee.id,
              server_id: serverEmployee.id,
              user_id: userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              business_id: localBusiness.id, // Use local business ID
              shop_id: serverEmployee.shop?.id || null,
              role_id: serverEmployee.role?.id || null,
              first_name: serverEmployee.user?.first_name || "",
              last_name: serverEmployee.user?.last_name || "",
              email: serverEmployee.user?.email || "",
              phone_number: serverEmployee.user?.phone_number || "",
              employment_type: serverEmployee.employment_type || "full_time",
              salary: serverEmployee.salary || null,
              is_active: serverEmployee.is_active !== false ? 1 : 0,
              employment_date: serverEmployee.employment_date || new Date().toISOString(),
              termination_date: serverEmployee.termination_date || null,
              sync_status: "synced",
              is_dirty: 0,
              created_at: serverEmployee.created_at || new Date().toISOString(),
              updated_at: serverEmployee.updated_at || new Date().toISOString(),
            };

            // Save employee to local database
            await databaseService.EmployeeService.createOrUpdateEmployee(employeeData);
            syncedCount++;
            console.log(`✅ Employee synced: ${serverEmployee.user?.first_name} ${serverEmployee.user?.last_name}`);
          }
        } catch (employeeError) {
          console.error(`❌ Error syncing employee ${serverEmployee.id}:`, employeeError);
          errorCount++;
        }
      }

      return {
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: serverEmployees.length,
        message: `Synced ${syncedCount} employees from server (${errorCount} errors)`,
      };
    } catch (error) {
      console.error("❌ Error in syncMissingEmployees:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Sync all data for a business (complete sync)
  syncBusinessData: async (user, authToken, businessServerId) => {
    try {
      console.log("🔄 Starting complete sync for business:", businessServerId);

      // Get the local business to get local ID
      const localBusiness = await databaseService.BusinessService.getBusinessByServerId(
        businessServerId
      );

      if (!localBusiness) {
        return {
          success: false,
          error: "Local business not found. Please sync business first.",
        };
      }

      // Step 1: Sync shops
      console.log("🛍️ Syncing shops...");
      const shopsResponse = await axios.get(
        `${API_URL}/shops/shops/?business_id=${businessServerId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (shopsResponse.data.success) {
        for (const serverShop of shopsResponse.data.shops) {
          await databaseService.ShopService.createOrUpdateShop({
            id: serverShop.id,
            server_id: serverShop.id,
            business_id: localBusiness.id, // Use local business ID
            business_server_id: businessServerId,
            name: serverShop.name,
            shop_type: serverShop.shop_type,
            location: serverShop.location,
            phone_number: serverShop.phone_number || "",
            email: serverShop.email || "",
            tax_rate: parseFloat(serverShop.tax_rate) || 0.0,
            currency: serverShop.currency || "KES",
            employee_count: parseInt(serverShop.employee_count) || 0,
            is_active: serverShop.is_active !== false ? 1 : 0,
            created_at: serverShop.created_at,
            updated_at: serverShop.updated_at,
            sync_status: "synced",
            is_dirty: 0,
          });
        }
        console.log(`✅ Synced ${shopsResponse.data.shops.length} shops`);
      }

      // Step 2: Sync employees
      const employeesResult = await SyncService.syncMissingEmployees(
        user,
        authToken,
        businessServerId
      );

      // Step 3: Sync roles (if needed)
      console.log("🎭 Syncing roles...");
      const rolesResponse = await axios.get(`${API_URL}/shops/roles/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (rolesResponse.data.success) {
        for (const serverRole of rolesResponse.data.roles) {
          await databaseService.RoleService.saveRole({
            id: serverRole.id,
            server_id: serverRole.id,
            name: serverRole.name,
            role_type: serverRole.role_type,
            description: serverRole.description || "",
            is_default: serverRole.is_default || false,
            created_at: serverRole.created_at,
          });
        }
        console.log(`✅ Synced ${rolesResponse.data.roles.length} roles`);
      }

      // Step 4: Sync users (if they have profile data)
      console.log("👥 Syncing user profiles...");
      const accountsResponse = await axios.get(`${API_URL}/accounts/sync-data/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (accountsResponse.data && accountsResponse.data.users) {
        for (const serverUser of accountsResponse.data.users) {
          await databaseService.UserService.saveUser({
            id: serverUser.id,
            server_id: serverUser.id,
            username: serverUser.username,
            email: serverUser.email,
            first_name: serverUser.first_name,
            last_name: serverUser.last_name,
            phone_number: serverUser.phone_number || "",
            user_type: serverUser.user_type || "employee",
            is_verified: serverUser.is_verified ? 1 : 0,
            is_active: serverUser.is_active !== false ? 1 : 0,
            last_login: serverUser.last_login,
            date_joined: serverUser.date_joined,
            profile_picture: serverUser.profile_picture || null,
            date_of_birth: serverUser.date_of_birth,
            preferences: serverUser.preferences || {},
          });
        }
        console.log(`✅ Synced ${accountsResponse.data.users.length} users`);
      }

      return {
        success: true,
        message: "Complete business data sync successful",
        summary: {
          shops: shopsResponse.data?.shops?.length || 0,
          employees: employeesResult.synced || 0,
          roles: rolesResponse.data?.roles?.length || 0,
          users: accountsResponse.data?.users?.length || 0,
        },
      };
    } catch (error) {
      console.error("❌ Complete business sync error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Check for missing data and sync
  checkAndSyncMissingData: async (user, authToken, businessServerId) => {
    try {
      console.log("🔍 Checking for missing data...");

      // Get local employees count
      const localBusiness = await databaseService.BusinessService.getBusinessByServerId(
        businessServerId
      );

      if (!localBusiness) {
        return {
          success: false,
          error: "Business not found locally",
        };
      }

      const localEmployees = await databaseService.EmployeeService.getEmployeesByBusiness(
        localBusiness.id
      );

      // Get server employees count
      const serverResponse = await axios.get(
        `${API_URL}/shops/employees/?business_id=${businessServerId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!serverResponse.data.success) {
        throw new Error("Failed to get server employees count");
      }

      const serverEmployeesCount = serverResponse.data.employees?.length || 0;
      const localEmployeesCount = localEmployees.length;

      console.log(
        `📊 Data check: Server has ${serverEmployeesCount} employees, Local has ${localEmployeesCount} employees`
      );

      if (serverEmployeesCount > localEmployeesCount) {
        const missingCount = serverEmployeesCount - localEmployeesCount;
        console.log(`⚠️ Found ${missingCount} missing employees`);

        // Ask user if they want to sync
        return {
          hasMissingData: true,
          missingCount,
          serverCount: serverEmployeesCount,
          localCount: localEmployeesCount,
          message: `Found ${missingCount} employees on server that are not in your local database.`,
        };
      }

      return {
        hasMissingData: false,
        message: "All data is synced!",
      };
    } catch (error) {
      console.error("❌ Error checking for missing data:", error);
      return {
        hasMissingData: false,
        error: error.message,
      };
    }
  },

  // Fix specific employee by ID
  fixMissingEmployee: async (user, authToken, employeeServerId, businessServerId) => {
    try {
      console.log(`🔧 Fixing specific employee: ${employeeServerId}`);

      // Get employee details from server
      const response = await axios.get(
        `${API_URL}/shops/employees/${employeeServerId}/`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to fetch employee from server");
      }

      const serverEmployee = response.data.employee;
      
      // Get local business ID
      const localBusiness = await databaseService.BusinessService.getBusinessByServerId(
        businessServerId
      );

      if (!localBusiness) {
        throw new Error("Local business not found");
      }

      // Save employee locally using the same logic as syncMissingEmployees
      let userId = null;
      if (serverEmployee.user) {
        const userResult = await databaseService.UserService.saveUser({
          id: serverEmployee.user.id,
          server_id: serverEmployee.user.id,
          username: serverEmployee.user.username || serverEmployee.user.email?.split('@')[0],
          email: serverEmployee.user.email,
          first_name: serverEmployee.user.first_name,
          last_name: serverEmployee.user.last_name,
          phone_number: serverEmployee.user.phone_number || "",
          user_type: "employee",
          is_active: serverEmployee.user.is_active !== false ? 1 : 0,
        });

        if (userResult && userResult.id) {
          userId = userResult.id;
        }
      }

      // Prepare employee data
      const employeeData = {
        id: serverEmployee.id,
        server_id: serverEmployee.id,
        user_id: userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        business_id: localBusiness.id,
        shop_id: serverEmployee.shop?.id || null,
        role_id: serverEmployee.role?.id || null,
        first_name: serverEmployee.user?.first_name || "",
        last_name: serverEmployee.user?.last_name || "",
        email: serverEmployee.user?.email || "",
        phone_number: serverEmployee.user?.phone_number || "",
        employment_type: serverEmployee.employment_type || "full_time",
        salary: serverEmployee.salary || null,
        is_active: serverEmployee.is_active !== false ? 1 : 0,
        employment_date: serverEmployee.employment_date || new Date().toISOString(),
        sync_status: "synced",
        is_dirty: 0,
        created_at: serverEmployee.created_at || new Date().toISOString(),
        updated_at: serverEmployee.updated_at || new Date().toISOString(),
      };

      // Save to local database
      await databaseService.EmployeeService.createOrUpdateEmployee(employeeData);

      return {
        success: true,
        message: `Employee ${serverEmployee.user?.first_name} ${serverEmployee.user?.last_name} synced successfully`,
      };
    } catch (error) {
      console.error("❌ Error fixing employee:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};