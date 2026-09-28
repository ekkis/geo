# Address roles

Canonical code: `S:G:AD:RO`. [Definition](index.json).

Roles describe the purpose for which an address is used, independently of its
postal format or country. A field declaring `"Choices": "S:G:AD:RO"` permits the
canonical codes of this branch’s terminal descendants. The parent branch and
intermediate grouping nodes are not answers. Clients display names, store codes,
and resolve the leaves from their versioned catalogue rather than copying a
second list into the field definition.

The current Role field holds one optional scalar answer. Generic `tags` can
reference multiple points, including these roles, but do not substitute for the
Role answer in address workflows. A code identifying Role itself does not mean
Shipping; the specific Shipping leaf does.

## Defined uses

### Residence — `S:G:AD:RO:RE`

Where a person lives. A residence may also be used for billing or shipping; this role describes residential use.

[Detailed definition](Residence/README.md).

### Office — `S:G:AD:RO:OF`

A place used for work or business operations. It need not be an organization’s legally registered office.

[Detailed definition](Office/README.md).

### Registered office — `S:G:AD:RO:RG`

The address designated as an organization’s registered office. Classification does not verify legal registration.

[Detailed definition](RegisteredOffice/README.md).

### Shipping — `S:G:AD:RO:SH`

The destination used to deliver goods or shipments.

[Detailed definition](Shipping/README.md).

### Billing — `S:G:AD:RO:BI`

The address associated with billing or invoicing. It can differ from the shipping destination.

[Detailed definition](Billing/README.md).

### Mailing — `S:G:AD:RO:MA`

The destination used for correspondence, including a postal box when applicable.

[Detailed definition](Mailing/README.md).

### Returns — `S:G:AD:RO:RT`

The destination designated to receive returned goods.

[Detailed definition](Returns/README.md).

### Pickup — `S:G:AD:RO:PU`

A location where goods or an order can be collected.

[Detailed definition](Pickup/README.md).

Residence describes living use; Office describes working use; Registered office describes a designated registration address. Shipping and Returns describe opposite goods flows, Mailing describes correspondence, Billing describes invoicing, and Pickup describes collection. No Other/free-text leaf is provided: a new canonical role needs a definition and README.

See [Address](../README.md) and the [US Role field](../US/Role.json).
