/**
 * Copyright 2025 RAIDS Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// i18n-processed-v1.1.0
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { CirclePlus, HardDriveIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ArrayPath, Path, UseFormReturn, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FileSelectDialog } from '@/components/file/file-select-dialog'
import AccordionCard from '@/components/form/accordion-card'
import Combobox from '@/components/form/combobox'
import { ComboboxItem } from '@/components/form/combobox'
import DatasetItem from '@/components/form/dataset-item'
import FormLabelMust from '@/components/form/form-label-must'

import { IDataset, apiGetDataset } from '@/services/api/dataset'

import { useResourcePathPolicy } from '@/hooks/use-resource-path-policy'

import { VolumeMountType, VolumeMountsSchema } from '@/utils/form'
import { isBlockedResourcePath } from '@/utils/resource-path-policy'
import { atomUserInfo } from '@/utils/store'

import { cn } from '@/lib/utils'

interface MountBatch {
  id: number
  fieldIDs: string[]
  parentPath: string
  expanded: boolean
}

interface VolumeMountsCardProps<
  T extends {
    volumeMounts: VolumeMountsSchema
  },
> {
  form: UseFormReturn<T>
  className?: string
}

export function VolumeMountsCard<
  T extends {
    volumeMounts: VolumeMountsSchema
  },
>({ form, className }: VolumeMountsCardProps<T>) {
  const { t } = useTranslation()
  const [dataMountOpen, setDataMountOpen] = useState<boolean>(true)
  const user = useAtomValue(atomUserInfo)
  const pathPolicy = useResourcePathPolicy()
  // Display-only groups: submission and template data remain flat volumeMounts.
  const [mountBatches, setMountBatches] = useState<MountBatch[]>([])
  const nextBatchID = useRef(0)
  const pendingBatch = useRef<{
    id: number
    firstFieldID: string
    count: number
    parentPath: string
  } | null>(null)

  // Get dataset information
  const datasetInfo = useQuery({
    queryKey: ['datsets'],
    queryFn: () => apiGetDataset(),
    select: (res) => {
      return res.data.map(
        (item) =>
          ({
            value: item.id.toString(),
            label: `${item.name} 
            (${item.extra.tag?.join(', ')})
            [${item.type === 'model' ? '模型' : '数据集'}]
            [${item.userInfo.nickname} ${item.userInfo.username}]`,
            selectedLabel: item.name,
            detail: item,
          }) as ComboboxItem<IDataset>
      )
    },
  })

  // Field array for volume mounts
  const {
    fields: volumeMountFields,
    append: volumeMountAppend,
    remove: volumeMountRemove,
    insert: volumeMountInsert,
  } = useFieldArray({
    name: 'volumeMounts' as ArrayPath<T>,
    control: form.control,
  })

  // Insert generates field IDs; bind the new batch after those fields are available.
  useEffect(() => {
    const pending = pendingBatch.current
    if (!pending) return
    const start = volumeMountFields.findIndex((field) => field.id === pending.firstFieldID)
    if (start < 0) return
    const fieldIDs = volumeMountFields.slice(start, start + pending.count).map((field) => field.id)
    if (fieldIDs.length !== pending.count) return
    pendingBatch.current = null
    const replacing = new Set(fieldIDs)
    setMountBatches((previous) => [
      ...previous
        .map((batch) => ({
          ...batch,
          fieldIDs: batch.fieldIDs.filter((id) => !replacing.has(id)),
        }))
        .filter((batch) => batch.fieldIDs.length),
      { id: pending.id, fieldIDs, parentPath: pending.parentPath, expanded: false },
    ])
  }, [volumeMountFields])

  const resetVolumeMountsFields = (index: number, type: number) => {
    form.setValue(`volumeMounts.${index}` as Path<T>, {
      type: type,
      subPath: '',
      mountPath: '',
    })
  }

  const currentValues = form.watch()
  const currentMounts = currentValues.volumeMounts ?? []
  const batchRows = new Map<number, { batch: MountBatch; indices: number[] }>()
  for (const batch of mountBatches) {
    const fieldIDs = new Set(batch.fieldIDs)
    const indices = volumeMountFields.flatMap((field, index) =>
      fieldIDs.has(field.id) ? [index] : []
    )
    for (const index of indices) batchRows.set(index, { batch, indices })
  }

  return (
    <AccordionCard
      cardTitle={t('volumeMounts.cardTitle')}
      icon={HardDriveIcon}
      open={dataMountOpen}
      setOpen={setDataMountOpen}
      className={className}
    >
      <div className="mt-3 space-y-5">
        {volumeMountFields.map((field, index) => {
          const grouped = batchRows.get(index)
          const expanded =
            !grouped ||
            grouped.batch.expanded ||
            grouped.indices.some((row) => form.formState.errors.volumeMounts?.[row])
          const firstInBatch = grouped?.indices[0] === index
          const names = firstInBatch
            ? grouped.indices.map((row) => {
                const mount = currentMounts[row]
                return (
                  datasetInfo.data?.find((item) => Number(item.value) === mount.datasetID)?.detail
                    ?.name ?? mount.mountPath
                )
              })
            : []
          return (
            <div
              key={field.id}
              hidden={!!grouped && !expanded && !firstInBatch}
              className={cn(
                !grouped && 'border-border bg-background rounded-lg border p-4',
                grouped && expanded && 'border-primary/25 border-l-2 pl-4'
              )}
            >
              {firstInBatch && (
                <div className="border-primary/30 bg-primary/5 relative flex items-center justify-between gap-3 rounded-lg border p-4 pr-10">
                  <button
                    type="button"
                    className="focus-visible:ring-ring absolute top-2 right-2 cursor-pointer rounded-sm p-1 opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden"
                    aria-label={t('mountSelection.removeBatch')}
                    title={t('mountSelection.removeBatch')}
                    onClick={() => {
                      volumeMountRemove(grouped.indices)
                      setMountBatches((previous) =>
                        previous.filter((batch) => batch.id !== grouped.batch.id)
                      )
                    }}
                  >
                    <XIcon className="size-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t('mountSelection.batchSummary', {
                        count: grouped.indices.length,
                        path: grouped.batch.parentPath,
                      })}
                    </p>
                    <p className="text-muted-foreground truncate text-xs" title={names.join(', ')}>
                      {names.slice(0, 3).join(', ')}
                      {names.length > 3 ? ` +${names.length - 3}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    aria-expanded={!!expanded}
                    onClick={() =>
                      setMountBatches((previous) =>
                        previous.map((batch) =>
                          batch.id === grouped.batch.id ? { ...batch, expanded: !expanded } : batch
                        )
                      )
                    }
                  >
                    {t(expanded ? 'mountSelection.collapseBatch' : 'mountSelection.expandBatch')}
                  </Button>
                </div>
              )}
              <div
                hidden={!expanded}
                className={cn(
                  grouped && 'border-border bg-background rounded-lg border p-4',
                  firstInBatch && 'mt-4'
                )}
              >
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name={`volumeMounts.${index}.subPath`}
                    render={({ field }) => {
                      const disabled =
                        form.getValues(`volumeMounts.${index}.mountPath`) === `/home/${user.name}`
                      return (
                        <FormItem className="relative">
                          <FormLabel>
                            {t('volumeMounts.mountSource', { index: index + 1 })}
                            <FormLabelMust />
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => {
                              volumeMountRemove(index)
                            }}
                            className="data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute -top-1.5 right-0 cursor-pointer rounded-sm opacity-50 transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none"
                          >
                            <XIcon className="size-4" />
                            <span className="sr-only">Close</span>
                          </button>
                          <FormControl>
                            <Tabs
                              value={
                                currentValues.volumeMounts[index]?.type === VolumeMountType.FileType
                                  ? 'file'
                                  : 'dataset'
                              }
                              onValueChange={(value) => {
                                form.setValue(
                                  `volumeMounts.${index}.type`,
                                  value === 'file'
                                    ? VolumeMountType.FileType
                                    : VolumeMountType.DataType
                                )
                              }}
                              className="w-full"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger
                                  value="file"
                                  onClick={() =>
                                    resetVolumeMountsFields(index, VolumeMountType.FileType)
                                  }
                                  className="cursor-pointer"
                                  disabled={disabled}
                                >
                                  {t('volumeMounts.fileTab')}
                                </TabsTrigger>
                                <TabsTrigger
                                  value="dataset"
                                  onClick={() =>
                                    resetVolumeMountsFields(index, VolumeMountType.DataType)
                                  }
                                  className="cursor-pointer"
                                  disabled={disabled}
                                >
                                  {t('volumeMounts.dataTab')}
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="file">
                                <FileSelectDialog
                                  resourcePath
                                  value={(field.value ?? '').split('/').pop()}
                                  handleSubmit={(item) => {
                                    field.onChange(item.id)
                                    form.setValue(
                                      `volumeMounts.${index}.type`,
                                      VolumeMountType.FileType
                                    )
                                    let mountName = `/data/${item.name}`
                                    switch (item.id) {
                                      case 'user':
                                        mountName = `/home/${user.name}`
                                        break
                                      case 'account':
                                        mountName = '/data/account'
                                        break
                                      case 'public':
                                        mountName = '/data/public'
                                        break
                                    }
                                    form.setValue(`volumeMounts.${index}.mountPath`, mountName)
                                  }}
                                  disabled={disabled}
                                />
                              </TabsContent>
                              <TabsContent value="dataset">
                                <Combobox
                                  items={datasetInfo.data ?? []}
                                  current={field.value}
                                  disabled={disabled}
                                  useDialog={true}
                                  pageSize={50}
                                  disabledValues={(datasetInfo.data ?? [])
                                    .filter((item) =>
                                      isBlockedResourcePath(
                                        item.detail?.url ?? '',
                                        pathPolicy.blockedPaths
                                      )
                                    )
                                    .map((item) => item.value)}
                                  handleMultiSelect={(values, parentPath) => {
                                    const selected = values
                                      .map((value) =>
                                        datasetInfo.data?.find((item) => item.value === value)
                                      )
                                      .filter(Boolean)
                                    const names = selected.map(
                                      (item) =>
                                        (item.detail?.name ?? item.value)
                                          .replace(/\\/g, '/')
                                          .split('/')
                                          .filter((part) => part && part !== '.' && part !== '..')
                                          .pop() || item.value
                                    )
                                    const mounts = selected.map((item, itemIndex) => {
                                      const name = names[itemIndex]
                                      const duplicates =
                                        names.filter((other) => other === name).length > 1
                                      return {
                                        type: VolumeMountType.DataType,
                                        datasetID: Number(item.value),
                                        subPath: item.value,
                                        mountPath: `${parentPath.replace(/\/+$/, '')}/${name}${duplicates ? `-${item.value}` : ''}`,
                                      }
                                    })
                                    if (!mounts.length) return
                                    if (mounts.length > 1) {
                                      pendingBatch.current = {
                                        id: nextBatchID.current++,
                                        firstFieldID: volumeMountFields[index].id,
                                        count: mounts.length,
                                        parentPath,
                                      }
                                    }
                                    form.setValue(
                                      `volumeMounts.${index}` as Path<T>,
                                      mounts[0] as never
                                    )
                                    if (mounts.length > 1)
                                      volumeMountInsert(index + 1, mounts.slice(1) as never)
                                  }}
                                  renderLabel={(item) => <DatasetItem item={item} />}
                                  handleSelect={(value) => {
                                    field.onChange(value)
                                    form.setValue(
                                      `volumeMounts.${index}.type`,
                                      VolumeMountType.DataType
                                    )
                                    form.setValue(`volumeMounts.${index}.datasetID`, Number(value))
                                    form.setValue(
                                      `volumeMounts.${index}.mountPath`,
                                      `/data/${datasetInfo.data?.find((item) => item.value === value)?.detail?.name}`
                                    )
                                  }}
                                  formTitle="数据"
                                />
                              </TabsContent>
                            </Tabs>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                  <FormField
                    control={form.control}
                    name={`volumeMounts.${index}.mountPath`}
                    render={({ field }) => {
                      const disabled =
                        form.getValues(`volumeMounts.${index}.mountPath`) === `/home/${user.name}`
                      return (
                        <FormItem>
                          <FormLabel>
                            {t('volumeMounts.mountPoint', { index: index + 1 })}
                            <FormLabelMust />
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="font-mono" />
                          </FormControl>
                          <FormDescription>
                            {disabled
                              ? t('volumeMounts.defaultMountDescription')
                              : t('volumeMounts.mountPathDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
        <Button
          type="button"
          variant="secondary"
          className="w-full cursor-pointer"
          onClick={() =>
            volumeMountAppend({
              type: VolumeMountType.FileType,
              subPath: '',
              mountPath: '',
            })
          }
        >
          <CirclePlus className="size-4" />
          {t('volumeMounts.addButton', {
            mountType: t('volumeMounts.cardTitle'),
          })}
        </Button>
      </div>
    </AccordionCard>
  )
}
