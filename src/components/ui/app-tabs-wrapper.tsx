"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  appTabsListClass,
  appTabsTriggerClass,
  appTabsPanelClass,
} from "@/components/ui/app-tabs";

type TabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

interface AppTabsWrapperProps {
  defaultValue: string;
  items: TabItem[];
  listClassName?: string;
  panelClassName?: string;
}

export function AppTabsWrapper({
  defaultValue,
  items,
  listClassName = "",
  panelClassName = "",
}: AppTabsWrapperProps) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <div className="mb-3">
        <TabsList className={`${appTabsListClass} ${listClassName}`}>
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={appTabsTriggerClass}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className={`${appTabsPanelClass} ${panelClassName}`}>
        {items.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-0">
            {item.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}