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
// Modified code
import { Check, ChevronsUpDown, ListFilter, XIcon } from 'lucide-react'
// import { ScrollArea } from "@/components/ui/scroll-area";
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

import { cn } from '@/lib/utils'

import TooltipButton from '../button/tooltip-button'

export interface ComboboxItem<T> {
  label: string
  value: string
  selectedLabel?: string
  tags?: string[]
  detail?: T
}

// 过滤器选项接口
export interface ComboboxFilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

// 通用过滤器接口 - 类似 DataTableFacetedFilter
export interface ComboboxFilter<T> {
  id: string // 过滤器唯一标识
  title: string // 过滤器标题
  options?: ComboboxFilterOption[] // 过滤器选项，如果不提供则从 items 中推断
  filterFn: (items: ComboboxItem<T>[], selectedValues: string[]) => ComboboxItem<T>[] // 过滤函数
  enabled?: boolean // 是否启用，默认true
}

type ComboboxProps<T> = React.HTMLAttributes<HTMLDivElement> & {
  formTitle: string
  items: ComboboxItem<T>[]
  current: string
  disabled?: boolean
  handleSelect: (value: string) => void
  renderLabel?: (item: ComboboxItem<T>) => React.ReactNode
  className?: string
  useDialog?: boolean
  pageSize?: number
  disabledValues?: string[]
  handleMultiSelect?: (values: string[], parentPath: string) => void
  filters?: ComboboxFilter<T>[] // 通用过滤器数组
}

const getSelectedLabel = <T,>(items: ComboboxItem<T>[], current: string): string | undefined => {
  const selectedItem = items.find((item) => item.value === current)
  return selectedItem ? (selectedItem.selectedLabel ?? selectedItem.label) : undefined
}

// 类似 DataTableFacetedFilter 的 Combobox 过滤器组件
interface ComboboxFacetedFilterProps<T> {
  filter: ComboboxFilter<T>
  items: ComboboxItem<T>[]
  selectedValues: Set<string>
  onValuesChange: (values: string[]) => void
}

function ComboboxFacetedFilter<T>({
  filter,
  items,
  selectedValues,
  onValuesChange,
}: ComboboxFacetedFilterProps<T>) {
  const { t } = useTranslation()

  // 从 items 中推断选项（如果未提供）
  const options = useMemo(() => {
    if (filter.options && filter.options.length > 0) {
      return filter.options
    }

    // 根据 filter.id 从 items 中推断选项
    const valueSet = new Set<string>()
    items.forEach((item) => {
      if (filter.id === 'tag-filter' && item.tags) {
        item.tags.forEach((tag) => valueSet.add(tag))
      } else if (filter.id === 'arch-filter') {
        const detail = item.detail as { archs?: string[] } | undefined
        const archs = detail?.archs
        if (archs) {
          archs.forEach((arch: string) => {
            const archName = arch.includes('/') ? arch.split('/').slice(1).join('/') : arch
            valueSet.add(archName)
          })
        }
      }
    })

    return Array.from(valueSet).map((value) => ({
      label: value,
      value,
    }))
  }, [filter.id, filter.options, items])

  if (options.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <ListFilter className="size-4" />
          <span className="text-xs">{filter.title}</span>
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} 已选
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>{t('combobox.noResults', { formTitle: filter.title })}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const newValues = new Set(selectedValues)
                      if (isSelected) {
                        newValues.delete(option.value)
                      } else {
                        newValues.add(option.value)
                      }
                      onValuesChange(Array.from(newValues))
                    }}
                  >
                    <div
                      className={cn(
                        'border-primary flex size-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className={cn('text-primary-foreground size-4')} />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onValuesChange([])}
                    className="justify-center text-center"
                  >
                    清除筛选
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const EMPTY_FILTERS: never[] = []

function Combobox<T>({
  formTitle,
  items,
  current,
  disabled,
  handleSelect,
  renderLabel,
  className,
  useDialog = false,
  filters = EMPTY_FILTERS,
  pageSize,
  disabledValues = [],
  handleMultiSelect,
}: ComboboxProps<T>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [multi, setMulti] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parentPath, setParentPath] = useState('/data')
  const multiSwitchId = useId()
  const mountPointId = useId()
  const itemsByValue = useMemo(() => new Map(items.map((item) => [item.value, item])), [items])
  const selectedLabel = (value: string) => {
    const item = itemsByValue.get(value)
    return item?.selectedLabel ?? item?.label ?? value
  }
  const removeSelected = (value: string) =>
    setSelected((previous) => {
      const next = new Set(previous)
      next.delete(value)
      return next
    })

  // 为每个过滤器维护状态
  const [filterStates, setFilterStates] = useState<Record<string, string[]>>({})

  // 启用的过滤器
  const enabledFilters = useMemo(
    () => filters.filter((filter) => filter.enabled !== false),
    [filters]
  )

  const filteredItems = useMemo(() => {
    let result = items

    // 应用所有启用的过滤器
    enabledFilters.forEach((filter) => {
      const selectedValues = filterStates[filter.id] || []
      result = filter.filterFn(result, selectedValues)
    })

    // 应用搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => item.label.toLowerCase().includes(query))
    }

    return result
  }, [items, searchQuery, enabledFilters, filterStates])

  const changeOpen = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setMulti(false)
      setSelected(new Set())
    }
  }

  const pages = pageSize ? Math.max(1, Math.ceil(filteredItems.length / pageSize)) : 1
  const activePage = Math.min(page, pages - 1)
  const visibleItems = pageSize
    ? filteredItems.slice(activePage * pageSize, (activePage + 1) * pageSize)
    : filteredItems
  const validParent =
    parentPath.startsWith('/') &&
    !parentPath.includes('\\') &&
    !parentPath.split('/').includes('..')

  const triggerButton = (
    <FormControl>
      <Button
        variant="outline"
        role="combobox"
        type="button"
        aria-expanded={open}
        aria-describedby=""
        className={cn(
          'w-full justify-between px-3 font-normal text-ellipsis whitespace-nowrap',
          'data-[state=open]:border-ring data-[state=open]:ring-ring/50 data-[state=open]:ring-[3px]',
          !current && 'text-muted-foreground',
          className
        )}
        disabled={disabled}
        onClick={() => !useDialog || setOpen(true)}
      >
        <p className="truncate">
          {current ? getSelectedLabel(items, current) : t('combobox.select', { formTitle })}
        </p>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
    </FormControl>
  )

  const commandContent = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={t('combobox.search', { formTitle })}
        className="h-9"
        onValueChange={(value) => {
          setSearchQuery(value)
          setPage(0)
        }}
      />

      {handleMultiSelect && (
        <div className="flex items-center gap-2 p-2" onKeyDown={(event) => event.stopPropagation()}>
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              id={multiSwitchId}
              checked={multi}
              onCheckedChange={(checked) => {
                setMulti(checked)
                setSelected(new Set(checked && current ? [current] : []))
              }}
            />
            <label htmlFor={multiSwitchId} className="cursor-pointer text-sm">
              {t('mountSelection.multiple')}
            </label>
            <span className="text-muted-foreground text-xs">
              {t(multi ? 'mountSelection.enabled' : 'mountSelection.disabled')}
            </span>
          </div>
          {multi && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label htmlFor={mountPointId} className="shrink-0 text-sm">
                {t('mountSelection.mountPoint')}
              </label>
              <Input
                id={mountPointId}
                placeholder={t('mountSelection.parent')}
                value={parentPath}
                onChange={(event) => setParentPath(event.target.value)}
              />
            </div>
          )}
        </div>
      )}
      {/* 渲染所有启用的过滤器组件 - 类似 toolbar */}
      {enabledFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          {enabledFilters.map((filter) => (
            <ComboboxFacetedFilter
              key={filter.id}
              filter={filter}
              items={items}
              selectedValues={new Set(filterStates[filter.id] || [])}
              onValuesChange={(values) => {
                setFilterStates((prev) => ({
                  ...prev,
                  [filter.id]: values,
                }))
              }}
            />
          ))}
          {/* 如果当前存在选中的过滤States，那么在最右侧提供一个一键清除按钮 */}
          <div className="flex flex-1 flex-row items-center justify-end">
            {Object.values(filterStates).some((vals) => vals.length > 0) && (
              <TooltipButton
                tooltipContent="清除筛选"
                variant="outline"
                size="icon"
                className="size-8 border-dashed"
                onClick={() => setFilterStates({})}
              >
                <XIcon />
              </TooltipButton>
            )}
          </div>
        </div>
      )}

      <CommandList className={handleMultiSelect ? 'max-h-[min(50dvh,500px)]' : undefined}>
        <CommandEmpty>{t('combobox.noResults', { formTitle })}</CommandEmpty>
        <CommandGroup>
          <div>
            {visibleItems.map((item) => (
              <CommandItem
                value={item.label}
                key={item.value}
                disabled={disabledValues.includes(item.value)}
                onSelect={() => {
                  if (multi && handleMultiSelect) {
                    setSelected((previous) => {
                      const next = new Set(previous)
                      if (next.has(item.value)) next.delete(item.value)
                      else next.add(item.value)
                      return next
                    })
                  } else {
                    handleSelect(item.value)
                    setOpen(false)
                  }
                }}
                className={cn(
                  'animate-in fade-in-0 flex w-full flex-row items-center justify-between duration-200',
                  handleMultiSelect &&
                    (multi ? selected.has(item.value) : item.value === current) &&
                    'bg-primary/10 ring-primary/20 data-[selected=true]:bg-primary/15 ring-1 ring-inset'
                )}
              >
                <div className="flex w-full flex-col">
                  <div>{renderLabel ? renderLabel(item) : item.label}</div>
                </div>
                <Check
                  className={cn(
                    'ml-auto size-4',
                    (multi ? selected.has(item.value) : item.value === current)
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
              </CommandItem>
            ))}
          </div>
        </CommandGroup>
      </CommandList>
      {pageSize && pages > 1 && (
        <div className="flex items-center justify-between p-2">
          <Button
            type="button"
            variant="outline"
            disabled={!activePage}
            onClick={() => setPage(activePage - 1)}
          >
            {t('mountSelection.previous')}
          </Button>
          <span>
            {activePage + 1} / {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={activePage + 1 >= pages}
            onClick={() => setPage(activePage + 1)}
          >
            {t('mountSelection.next')}
          </Button>
        </div>
      )}
      {multi && handleMultiSelect && selected.size > 0 && (
        <div
          className="flex min-w-0 flex-wrap items-center gap-1.5 border-t px-2 py-2"
          onKeyDown={(event) => event.stopPropagation()}
        >
          {Array.from(selected)
            .slice(0, 5)
            .map((value) => (
              <Badge key={value} variant="secondary" className="max-w-40 min-w-0 gap-1">
                <span className="truncate" title={selectedLabel(value)}>
                  {selectedLabel(value)}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-sm"
                  aria-label={t('mountSelection.removeSelected', { name: selectedLabel(value) })}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeSelected(value)
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          {selected.size > 5 && (
            <Popover modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={t('mountSelection.viewSelected', { count: selected.size })}
                >
                  {t('mountSelection.moreSelected')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-2" align="end">
                <p className="mb-2 text-sm font-medium">
                  {t('mountSelection.selected', { count: selected.size })}
                </p>
                <ul
                  className="max-h-[min(60dvh,400px)] overflow-y-auto overscroll-contain"
                  aria-label={t('mountSelection.viewSelected', { count: selected.size })}
                >
                  {Array.from(selected).map((value) => (
                    <li key={value} className="flex items-center gap-2 py-1">
                      <span
                        className="min-w-0 flex-1 truncate text-sm"
                        title={selectedLabel(value)}
                      >
                        {selectedLabel(value)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        aria-label={t('mountSelection.removeSelected', {
                          name: selectedLabel(value),
                        })}
                        onClick={(event) => {
                          event.stopPropagation()
                          removeSelected(value)
                        }}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
      {multi && handleMultiSelect && (
        <div className="flex items-center justify-between p-2">
          <span>{t('mountSelection.selected', { count: selected.size })}</span>
          <Button
            type="button"
            disabled={
              !validParent ||
              !selected.size ||
              Array.from(selected).some((value) => disabledValues.includes(value))
            }
            onClick={() => {
              handleMultiSelect(Array.from(selected), parentPath)
              setOpen(false)
              setMulti(false)
            }}
          >
            {t('mountSelection.confirm')}
          </Button>
        </div>
      )}
    </Command>
  )

  return useDialog ? (
    <>
      {triggerButton}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className={cn(
            'sm:max-w-[calc(100%-16rem)]',
            handleMultiSelect && 'max-h-[90dvh] overflow-y-auto'
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{formTitle}</DialogTitle>
          </DialogHeader>
          {commandContent}
        </DialogContent>
      </Dialog>
    </>
  ) : (
    <Popover modal open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        className="z-50 p-0"
        style={{
          width: 'var(--radix-popover-trigger-width)',
          maxHeight: 'var(--radix-popover-content-available-height)',
        }}
      >
        {commandContent}
      </PopoverContent>
    </Popover>
  )
}

export default Combobox
