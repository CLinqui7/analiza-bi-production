import { redirect } from "next/navigation";

type NewClosurePageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

function readFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function NewClosurePage({
  searchParams,
}: NewClosurePageProps) {
  const params = searchParams ? await searchParams : {};
  const line = readFirstParam(params.line);
  const query = new URLSearchParams();

  if (line) {
    query.set("line", line);
  }

  const queryString = query.toString();

  redirect(`/protected/importaciones${queryString ? `?${queryString}` : ""}`);
}
