// Pure unit check for mapSacRoles. Run: node --experimental-strip-types scripts/test-role-mapping.mts
import { mapSacRoles, tokenCarriesRoleInfo } from "../modules/vacation/auth/roleMapping.ts";

let failures = 0;
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    failures++;
    console.error(`FAIL ${label}: got ${g}, want ${w}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// resource_access drives the mapping
eq(
  "resource_access JEFATURA_ADMIN",
  mapSacRoles({ sub: "x", resource_access: { "sac-mate": { roles: ["JEFATURA_ADMIN"] } } }),
  ["Jefe_Administrativo"]
);
eq(
  "resource_access PROFESOR",
  mapSacRoles({ sub: "x", resource_access: { "sac-mate": { roles: ["PROFESOR"] } } }),
  ["Profesor"]
);
// dev username fallback when no resource_access role maps
eq(
  "username fallback dev-director",
  mapSacRoles({ sub: "x", preferred_username: "dev-director" }),
  ["Director_de_Escuela"]
);
// unknown SAC role -> []
eq(
  "unknown role ROLE_VIEWER",
  mapSacRoles({ sub: "x", resource_access: { "sac-mate": { roles: ["ROLE_VIEWER"] } } }),
  []
);
// resource_access wins over username
eq(
  "resource_access wins over username",
  mapSacRoles({
    sub: "x",
    preferred_username: "dev-profesor",
    resource_access: { "sac-mate": { roles: ["JEFATURA_ADMIN"] } },
  }),
  ["Jefe_Administrativo"]
);
// dedupe duplicate roles
eq(
  "dedupe",
  mapSacRoles({ sub: "x", resource_access: { "sac-mate": { roles: ["PROFESOR", "PROFESOR"] } } }),
  ["Profesor"]
);
// no claims at all -> []
eq("empty payload", mapSacRoles({ sub: "x" }), []);

// tokenCarriesRoleInfo guard
eq(
  "carriesRoleInfo: resource_access present",
  tokenCarriesRoleInfo({ sub: "x", resource_access: { "sac-mate": { roles: [] } } }),
  true
);
eq(
  "carriesRoleInfo: dev username",
  tokenCarriesRoleInfo({ sub: "x", preferred_username: "dev-director" }),
  true
);
eq(
  "carriesRoleInfo: dev/login token (qa.user, no resource_access)",
  tokenCarriesRoleInfo({ sub: "x", preferred_username: "qa.user" }),
  false
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
