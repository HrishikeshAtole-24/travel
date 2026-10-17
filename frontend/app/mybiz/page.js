import ComingSoon from '../components/ComingSoon/ComingSoon';

export const metadata = { title: 'myBiz · SkyWings' };

export default function MyBizPage() {
  return (
    <ComingSoon
      icon="briefcase"
      eyebrow="myBiz"
      title="Business travel, without the spreadsheets"
      text="A company account for booking and tracking team travel is in the works. If your team books often, talk to us about early access."
      points={[
        { icon: 'users', title: 'One company account', text: 'Book for colleagues and see every trip in one place.' },
        { icon: 'tag', title: 'GST-ready invoices', text: 'Invoices with your company GSTIN for every booking.' },
        { icon: 'sliders', title: 'Travel policies', text: 'Set cabin and hotel limits that apply automatically.' }
      ]}
    />
  );
}
