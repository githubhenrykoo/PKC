import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MCardBrowser } from "@/components/Mcard/MCardBrowser";

// Define the client directive props for Astro compatibility
interface DashboardLayoutProps {
  title?: string;
  'client:load'?: boolean;
  'client:idle'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
}

export function DashboardLayout({ title = "PKC Dashboard" }: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <TopBar title="PKC" />

      <div className="flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <Sidebar />

        {/* Main Content */}
        <main className="container flex w-full flex-1 flex-col overflow-hidden py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">View and manage your MCard content</p>
            </div>
            
            <div className="grid gap-6">
              {/* MCard Browser Component */}
              <MCardBrowser />
              
              {/* Recent Activity Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 min-h-[100px] flex items-center justify-center">
                  <p className="text-muted-foreground italic">No recent activity to display</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
