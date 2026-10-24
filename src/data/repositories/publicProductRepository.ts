import type Database from "better-sqlite3";
import type { FinancialProduct } from "../../shared/types/domain";

export class PublicProductRepository {
  public constructor(private readonly database: Database.Database) {}

  public list(): FinancialProduct[] {
    return this.database
      .prepare("SELECT normalized_json FROM financial_products ORDER BY retrieved_at DESC")
      .all()
      .map(
        (row) =>
          JSON.parse((row as { normalized_json: string }).normalized_json) as FinancialProduct,
      );
  }

  public replace(products: FinancialProduct[]): void {
    this.database.transaction(() => {
      this.database.prepare("DELETE FROM financial_products").run();
      const upsertSource = this.database.prepare(
        `INSERT INTO source_records(
          id, source_url, source_name, source_type, retrieved_at, last_verified_at, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          retrieved_at = excluded.retrieved_at,
          last_verified_at = excluded.last_verified_at,
          confidence = excluded.confidence`,
      );
      const insertProduct = this.database.prepare(
        `INSERT INTO financial_products(id, normalized_json, source_id, retrieved_at)
         VALUES (?, ?, ?, ?)`,
      );
      for (const product of products) {
        const sourceId = product.id + ":source";
        const source = product.provenance;
        upsertSource.run(
          sourceId,
          source.sourceUrl,
          source.sourceName,
          source.sourceType,
          source.retrievedAt,
          source.lastVerifiedAt,
          source.confidence,
        );
        insertProduct.run(product.id, JSON.stringify(product), sourceId, source.retrievedAt);
      }
    })();
  }
}
