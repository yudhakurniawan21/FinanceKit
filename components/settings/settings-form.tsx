"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";
import { upsertUserSettings, deleteAccountAction } from "@/app/actions/settings";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { LOCALES, DATE_FORMATS, TIMEZONES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/client";
import type { UserSettings } from "@/lib/generated/prisma/client";

export function SettingsForm({
  settings,
}: {
  settings: UserSettings | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, action, isPending] = useActionState(upsertUserSettings, null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAccountAction,
    null
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (deleteState?.success) {
      router.push("/sign-in");
    }
  }, [deleteState, router]);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>{t("appSettingsTitle")}</CardTitle>
          <CardDescription>
            {t("appSettingsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state?.success && (
            <p className="text-sm text-positive">
              {t("settingsSaved")}
            </p>
          )}
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <SelectField
            label={t("currencyLabel")}
            description={t("currencyDesc")}
            value={settings?.currency ?? "IDR"}
            options={SUPPORTED_CURRENCIES.map((c) => ({
              value: c.code,
              label: `${c.code} — ${c.name} (${c.symbol})`,
            }))}
            name="currency"
            disabled={isPending}
          />

          <SelectField
            label={t("languageLabel")}
            description={t("languageDesc")}
            value={settings?.locale ?? "id-ID"}
            options={LOCALES as readonly { value: string; label: string }[]}
            name="locale"
            disabled={isPending}
          />

          <SelectField
            label={t("dateFormatLabel")}
            description={t("dateFormatDesc")}
            value={settings?.dateFormat ?? "dd/MM/yyyy"}
            options={DATE_FORMATS as readonly { value: string; label: string }[]}
            name="dateFormat"
            disabled={isPending}
          />

          <SelectField
            label={t("timeZoneLabel")}
            description={t("timeZoneDesc")}
            value={settings?.timeZone ?? "Asia/Jakarta"}
            options={TIMEZONES as readonly { value: string; label: string }[]}
            name="timeZone"
            disabled={isPending}
          />

          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? t("saving") : t("saveSettings")}
          </Button>
        </CardContent>
      </Card>
      </form>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
          <CardDescription>
            {t("dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-3">
          {!confirming ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteAccount")}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {t("confirmDeleteAccount")}
              </span>
              <form action={deleteAction} className="contents">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deletePending}
                >
                  {deletePending ? t("deleting") : t("yesDeleteAccount")}
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                disabled={deletePending}
                onClick={() => setConfirming(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          )}
          {deleteState?.error && (
            <p className="text-sm text-destructive">{deleteState.error}</p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// Select terkontrol + hidden input (konvensi proyek: pakai useActionState,
// tidak pakai react-hook-form). Base UI Select onValueChange kirim string|null.
function SelectField({
  label,
  description,
  value,
  options,
  name,
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  options: readonly { value: string; label: string }[];
  name: string;
  disabled: boolean;
}) {
  const [current, setCurrent] = useState(value);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="text-sm font-medium">{label}</label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={disabled ? "pointer-events-none opacity-60" : ""}>
        <Select
          value={current}
          onValueChange={(v: string | null) => setCurrent(v ?? "")}
          disabled={disabled}
          items={options.map((o) => ({ value: o.value, label: o.label }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem value={o.value} key={o.value} label={o.label}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name={name} value={current} />
      </div>
    </div>
  );
}
