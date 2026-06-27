'use client';

import { Upload } from 'lucide-react';
import { ChangeEvent, DragEvent, ReactNode, useRef, useState } from 'react';

import { cn } from '@/utils/cn';

type CsvUploadControlProps = {
  disabled?: boolean;
  onFilesSelected: (files: FileList) => Promise<void> | void;
};

type CsvUploadInputProps = CsvUploadControlProps & {
  className?: string;
};

const CsvUploadInput = ({
  className,
  disabled,
  onFilesSelected,
}: CsvUploadInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget;

    if (!files?.length || disabled) {
      return;
    }

    await onFilesSelected(files);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <input
      ref={inputRef}
      accept=".csv,text/csv"
      className={cn('sr-only', className)}
      disabled={disabled}
      type="file"
      onChange={handleChange}
    />
  );
};

type CsvUploadButtonProps = CsvUploadControlProps & {
  children?: ReactNode;
  className?: string;
};

export const CsvUploadButton = ({
  children = 'Upload CSV',
  className,
  disabled,
  onFilesSelected,
}: CsvUploadButtonProps) => {
  return (
    <label
      className={cn(
        'inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity md:self-auto',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <Upload className="size-4" aria-hidden="true" />
      {children}
      <CsvUploadInput disabled={disabled} onFilesSelected={onFilesSelected} />
    </label>
  );
};

type CsvUploadDropzoneProps = CsvUploadControlProps & {
  description?: ReactNode;
  title?: ReactNode;
};

export const CsvUploadDropzone = ({
  description = 'Drag a bank export here or click to browse. Supported format: .csv.',
  disabled,
  onFilesSelected,
  title = 'Upload CSV',
}: CsvUploadDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled || !event.dataTransfer.files.length) {
      return;
    }

    await onFilesSelected(event.dataTransfer.files);
  };

  return (
    <label
      className={cn(
        'group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] p-8 text-center transition-colors hover:bg-[hsl(var(--surface-low))]',
        isDragging &&
          'border-[hsl(var(--foreground))] bg-[hsl(var(--surface-low))]',
        disabled && 'cursor-wait opacity-80',
      )}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <CsvUploadInput disabled={disabled} onFilesSelected={onFilesSelected} />
      <span className="mb-5 grid size-16 place-items-center rounded bg-[hsl(var(--surface-high))]">
        <Upload className="size-8" aria-hidden="true" />
      </span>
      <span className="text-2xl font-bold leading-8">{title}</span>
      <span className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--on-surface-variant))]">
        {description}
      </span>
    </label>
  );
};
