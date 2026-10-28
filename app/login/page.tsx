import { loginAs } from "@/lib/actions";
import { USERS } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Internal Tools</h1>
      <p className="mt-2 text-sm text-gray-600">
        Demo sign-in. In production this screen is replaced by the company identity provider
        (Okta or Entra ID); roles come from group claims. Pick a user to see what their role can do.
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {USERS.map((u) => (
          <li key={u.id}>
            <form action={loginAs}>
              <input type="hidden" name="user" value={u.id} />
              <button
                type="submit"
                className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-blue-400 hover:shadow"
              >
                <div className="font-medium text-gray-900">{u.name}</div>
                <div className="text-sm text-gray-600">{u.team}</div>
                <div className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {u.role}
                </div>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
