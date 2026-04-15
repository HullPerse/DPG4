import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback } from "react";
import RulesApi from "@/api/rules.api";
import { Rule, RuleCategory } from "@/types/rules";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { highlightText } from "@/lib/utils";

const rulesApi = new RulesApi();

function RulesBrowser({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rulesTab"],
    queryFn: async (): Promise<{ category: RuleCategory[]; rules: Rule[] }> => {
      const rules = await rulesApi.getRules();

      return {
        category: rules.map((rule) => rule.category),
        rules: rules,
      };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["rulesTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("rules", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-y-scroll p-2 items-center">
      {data?.category
        .filter((v, i, a) => a.indexOf(v) == i)
        .map((category, index) => {
          const rules = data?.rules.filter(
            (item) => item.category === category,
          );

          return (
            <section
              key={category}
              className="flex flex-col w-full items-center"
            >
              <div className="border-2 border-highlight-high p-2 h-14 flex w-full font-bold items-center justify-start text-2xl bg-background text-text shadow-sharp-sm underline gap-0">
                {index + 1}. {category}
              </div>
              <div className="flex flex-col w-[97%] min-h-fit bg-background border-x-2 border-b-2 border-t-none border-highlight-high shadow-sharp-sm leading-relaxed divide-y divide-highlight-high/30 [&>*:nth-child(odd)]:bg-highlight-high/10 overflow-hidden transition-all duration-300">
                {rules
                  ?.filter((rule) =>
                    rule.rule.toUpperCase().includes(searchTerms.toUpperCase()),
                  )
                  .map((rule, index) => (
                    <div key={index} className="p-2">
                      <p>
                        {index + 1}.{" "}
                        {highlightText(String(rule.rule), searchTerms)}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          );
        })}
    </main>
  );
}

export default memo(RulesBrowser);
